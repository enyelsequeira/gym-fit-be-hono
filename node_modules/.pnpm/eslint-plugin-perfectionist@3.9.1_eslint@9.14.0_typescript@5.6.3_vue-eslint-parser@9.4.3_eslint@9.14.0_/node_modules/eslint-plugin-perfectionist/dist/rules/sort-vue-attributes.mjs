import path from 'node:path'
import { validateGroupsConfiguration } from '../utils/validate-groups-configuration.mjs'
import { sortNodesByGroups } from '../utils/sort-nodes-by-groups.mjs'
import { createEslintRule } from '../utils/create-eslint-rule.mjs'
import { getGroupNumber } from '../utils/get-group-number.mjs'
import { getSourceCode } from '../utils/get-source-code.mjs'
import { rangeToDiff } from '../utils/range-to-diff.mjs'
import { useGroups } from '../utils/use-groups.mjs'
import { makeFixes } from '../utils/make-fixes.mjs'
import { complete } from '../utils/complete.mjs'
import { pairwise } from '../utils/pairwise.mjs'
const sortVueAttributes = createEslintRule({
  name: 'sort-vue-attributes',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce sorted Vue attributes.',
    },
    fixable: 'code',
    deprecated: true,
    replacedBy: ['vue/attributes-order'],
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
      unexpectedVueAttributesGroupOrder:
        'Expected "{{right}}" ({{rightGroup}}) to come before "{{left}}" ({{leftGroup}}).',
      unexpectedVueAttributesOrder:
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
  create: context => {
    let sourceCode = getSourceCode(context)
    if (path.extname(context.filename) !== '.vue') {
      return {}
    }
    if (!('defineTemplateBodyVisitor' in sourceCode.parserServices)) {
      return {}
    }
    let { defineTemplateBodyVisitor } = sourceCode.parserServices
    return defineTemplateBodyVisitor({
      VStartTag: node => {
        if (node.attributes.length > 1) {
          let settings = context.settings.perfectionist
          let options = complete(context.options.at(0), settings, {
            type: 'alphabetical',
            ignoreCase: true,
            specialCharacters: 'keep',
            customGroups: {},
            matcher: 'minimatch',
            order: 'asc',
            groups: [],
          })
          validateGroupsConfiguration(
            options.groups,
            ['multiline', 'shorthand', 'unknown'],
            Object.keys(options.customGroups),
          )
          let parts = node.attributes.reduce(
            (accumulator, attribute) => {
              if (
                attribute.key.type === 'VDirectiveKey' &&
                attribute.key.name.rawName === 'bind'
              ) {
                accumulator.push([])
                return accumulator
              }
              let name
              let { getGroup, defineGroup, setCustomGroups } =
                useGroups(options)
              if (
                typeof attribute.key.name === 'string' &&
                attribute.key.type !== 'VDirectiveKey'
              ) {
                name = attribute.key.rawName
              } else {
                name = sourceCode.text.slice(...attribute.key.range)
              }
              setCustomGroups(options.customGroups, name)
              if (attribute.value === null) {
                defineGroup('shorthand')
              }
              if (attribute.loc.start.line !== attribute.loc.end.line) {
                defineGroup('multiline')
              }
              accumulator.at(-1).push({
                node: attribute,
                size: rangeToDiff(attribute.range),
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
                      ? 'unexpectedVueAttributesGroupOrder'
                      : 'unexpectedVueAttributesOrder',
                  data: {
                    left: left.name,
                    leftGroup: left.group,
                    right: right.name,
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
    })
  },
})
export { sortVueAttributes as default }
