'use strict'
const path = require('node:path')
const validateGroupsConfiguration = require('../utils/validate-groups-configuration.js')
const sortNodesByGroups = require('../utils/sort-nodes-by-groups.js')
const createEslintRule = require('../utils/create-eslint-rule.js')
const getGroupNumber = require('../utils/get-group-number.js')
const getSourceCode = require('../utils/get-source-code.js')
const rangeToDiff = require('../utils/range-to-diff.js')
const getSettings = require('../utils/get-settings.js')
const useGroups = require('../utils/use-groups.js')
const makeFixes = require('../utils/make-fixes.js')
const pairwise = require('../utils/pairwise.js')
const complete = require('../utils/complete.js')
const sortAstroAttributes = createEslintRule.createEslintRule({
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
          let settings = getSettings.getSettings(context.settings)
          let options = complete.complete(context.options.at(0), settings, {
            type: 'alphabetical',
            ignoreCase: true,
            specialCharacters: 'keep',
            matcher: 'minimatch',
            customGroups: {},
            order: 'asc',
            groups: [],
          })
          validateGroupsConfiguration.validateGroupsConfiguration(
            options.groups,
            ['astro-shorthand', 'multiline', 'shorthand', 'unknown'],
            Object.keys(options.customGroups),
          )
          let sourceCode = getSourceCode.getSourceCode(context)
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
                useGroups.useGroups(options)
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
                size: rangeToDiff.rangeToDiff(attribute.range),
                node: attribute,
                group: getGroup(),
                name,
              })
              return accumulator
            },
            [[]],
          )
          for (let nodes of parts) {
            let sortedNodes = sortNodesByGroups.sortNodesByGroups(
              nodes,
              options,
            )
            pairwise.pairwise(nodes, (left, right) => {
              let indexOfLeft = sortedNodes.indexOf(left)
              let indexOfRight = sortedNodes.indexOf(right)
              if (indexOfLeft > indexOfRight) {
                let leftNum = getGroupNumber.getGroupNumber(
                  options.groups,
                  left,
                )
                let rightNum = getGroupNumber.getGroupNumber(
                  options.groups,
                  right,
                )
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
                    makeFixes.makeFixes(fixer, nodes, sortedNodes, sourceCode),
                })
              }
            })
          }
        }
      },
    }
  },
})
module.exports = sortAstroAttributes
