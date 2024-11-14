import path from 'node:path'
import { validateGroupsConfiguration } from '../utils/validate-groups-configuration.mjs'
import { sortNodesByGroups } from '../utils/sort-nodes-by-groups.mjs'
import { createEslintRule } from '../utils/create-eslint-rule.mjs'
import { getGroupNumber } from '../utils/get-group-number.mjs'
import { getSourceCode } from '../utils/get-source-code.mjs'
import { rangeToDiff } from '../utils/range-to-diff.mjs'
import { getSettings } from '../utils/get-settings.mjs'
import { useGroups } from '../utils/use-groups.mjs'
import { makeFixes } from '../utils/make-fixes.mjs'
import { pairwise } from '../utils/pairwise.mjs'
import { complete } from '../utils/complete.mjs'
const sortAstroAttributes = createEslintRule({
  name: 'sort-astro-attributes',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce sorted Astro attributes.',
    },
    fixable: 'code',
    deprecated: true,
    replacedBy: ['astro/sort-attributes'],
    schema: [
      {
        type: 'object',
        properties: {
          type: {
            description: 'Specifies the sorting method.',
            type: 'string',
            enum: ['alphabetical', 'natural', 'line-length'],
          },
          order: {
            description:
              'Determines whether the sorted items should be in ascending or descending order.',
            type: 'string',
            enum: ['asc', 'desc'],
          },
          matcher: {
            description: 'Specifies the string matcher.',
            type: 'string',
            enum: ['minimatch', 'regex'],
          },
          ignoreCase: {
            description:
              'Controls whether sorting should be case-sensitive or not.',
            type: 'boolean',
          },
          specialCharacters: {
            description:
              'Controls how special characters should be handled before sorting.',
            type: 'string',
            enum: ['remove', 'trim', 'keep'],
          },
          groups: {
            description: 'Specifies the order of the groups.',
            type: 'array',
            items: {
              oneOf: [
                {
                  type: 'string',
                },
                {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
              ],
            },
          },
          customGroups: {
            description: 'Specifies custom groups.',
            type: 'object',
            additionalProperties: {
              oneOf: [
                {
                  type: 'string',
                },
                {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
              ],
            },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unexpectedAstroAttributesGroupOrder:
        'Expected "{{right}}" ({{rightGroup}}) to come before "{{left}}" ({{leftGroup}}).',
      unexpectedAstroAttributesOrder:
        'Expected "{{right}}" to come before "{{left}}".',
    },
  },
  defaultOptions: [
    {
      type: 'alphabetical',
      order: 'asc',
      ignoreCase: true,
      specialCharacters: 'keep',
      matcher: 'minimatch',
      groups: [],
      customGroups: {},
    },
  ],
  // @ts-ignore
  create: context => {
    if (path.extname(context.filename) !== '.astro') {
      return {}
    }
    return {
      JSXElement: node => {
        let { attributes } = node.openingElement
        if (attributes.length > 1) {
          let settings = getSettings(context.settings)
          let options = complete(context.options.at(0), settings, {
            type: 'alphabetical',
            ignoreCase: true,
            specialCharacters: 'keep',
            matcher: 'minimatch',
            customGroups: {},
            order: 'asc',
            groups: [],
          })
          validateGroupsConfiguration(
            options.groups,
            ['astro-shorthand', 'multiline', 'shorthand', 'unknown'],
            Object.keys(options.customGroups),
          )
          let sourceCode = getSourceCode(context)
          let parts = attributes.reduce(
            (accumulator, attribute) => {
              if (attribute.type === 'JSXSpreadAttribute') {
                accumulator.push([])
                return accumulator
              }
              let name =
                typeof attribute.name.name === 'string'
                  ? attribute.name.name
                  : sourceCode.text.slice(...attribute.name.range)
              let { getGroup, defineGroup, setCustomGroups } =
                useGroups(options)
              setCustomGroups(options.customGroups, name)
              if (attribute.type === 'AstroShorthandAttribute') {
                defineGroup('astro-shorthand')
                defineGroup('shorthand')
              }
              if (attribute.value === null) {
                defineGroup('shorthand')
              }
              if (attribute.loc.start.line !== attribute.loc.end.line) {
                defineGroup('multiline')
              }
              accumulator.at(-1).push({
                size: rangeToDiff(attribute.range),
                node: attribute,
                group: getGroup(),
                name,
              })
              return accumulator
            },
            [[]],
          )
          for (let nodes of parts) {
            let sortedNodes = sortNodesByGroups(nodes, options)
            pairwise(nodes, (left, right) => {
              let indexOfLeft = sortedNodes.indexOf(left)
              let indexOfRight = sortedNodes.indexOf(right)
              if (indexOfLeft > indexOfRight) {
                let leftNum = getGroupNumber(options.groups, left)
                let rightNum = getGroupNumber(options.groups, right)
                context.report({
                  messageId:
                    leftNum !== rightNum
                      ? 'unexpectedAstroAttributesGroupOrder'
                      : 'unexpectedAstroAttributesOrder',
                  data: {
                    left: left.name,
                    right: right.name,
                    leftGroup: left.group,
                    rightGroup: right.group,
                  },
                  node: right.node,
                  fix: fixer =>
                    makeFixes(fixer, nodes, sortedNodes, sourceCode),
                })
              }
            })
          }
        }
      },
    }
  },
})
export { sortAstroAttributes as default }
