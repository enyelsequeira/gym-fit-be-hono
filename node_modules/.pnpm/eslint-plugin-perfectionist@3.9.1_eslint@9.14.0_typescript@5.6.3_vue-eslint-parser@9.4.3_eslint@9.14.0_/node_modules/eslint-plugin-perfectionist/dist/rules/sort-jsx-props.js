'use strict'
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
const matches = require('../utils/matches.js')
const sortJsxProps = createEslintRule.createEslintRule({
  name: 'sort-jsx-props',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce sorted JSX props.',
    },
    fixable: 'code',
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
          ignorePattern: {
            description:
              'Specifies names or patterns for nodes that should be ignored by rule.',
            items: {
              type: 'string',
            },
            type: 'array',
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
      unexpectedJSXPropsGroupOrder:
        'Expected "{{right}}" ({{rightGroup}}) to come before "{{left}}" ({{leftGroup}}).',
      unexpectedJSXPropsOrder:
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
      ignorePattern: [],
      groups: [],
      customGroups: {},
    },
  ],
  create: context => ({
    JSXElement: node => {
      if (node.openingElement.attributes.length > 1) {
        let settings = getSettings.getSettings(context.settings)
        let options = complete.complete(context.options.at(0), settings, {
          type: 'alphabetical',
          ignorePattern: [],
          ignoreCase: true,
          specialCharacters: 'keep',
          matcher: 'minimatch',
          customGroups: {},
          order: 'asc',
          groups: [],
        })
        validateGroupsConfiguration.validateGroupsConfiguration(
          options.groups,
          ['multiline', 'shorthand', 'unknown'],
          Object.keys(options.customGroups),
        )
        let sourceCode = getSourceCode.getSourceCode(context)
        let shouldIgnore = false
        if (options.ignorePattern.length) {
          let tagName = sourceCode.text.slice(...node.openingElement.name.range)
          shouldIgnore = options.ignorePattern.some(pattern =>
            matches.matches(tagName, pattern, options.matcher),
          )
        }
        if (!shouldIgnore && node.openingElement.attributes.length > 1) {
          let parts = node.openingElement.attributes.reduce(
            (accumulator, attribute) => {
              if (attribute.type === 'JSXSpreadAttribute') {
                accumulator.push([])
                return accumulator
              }
              let name =
                attribute.name.type === 'JSXNamespacedName'
                  ? `${attribute.name.namespace.name}:${attribute.name.name.name}`
                  : attribute.name.name
              let { getGroup, defineGroup, setCustomGroups } =
                useGroups.useGroups(options)
              setCustomGroups(options.customGroups, name)
              if (attribute.value === null) {
                defineGroup('shorthand')
              }
              if (attribute.loc.start.line !== attribute.loc.end.line) {
                defineGroup('multiline')
              }
              let jsxNode = {
                size: rangeToDiff.rangeToDiff(attribute.range),
                group: getGroup(),
                node: attribute,
                name,
              }
              accumulator.at(-1).push(jsxNode)
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
                      ? 'unexpectedJSXPropsGroupOrder'
                      : 'unexpectedJSXPropsOrder',
                  data: {
                    left: left.name,
                    leftGroup: left.group,
                    right: right.name,
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
      }
    },
  }),
})
module.exports = sortJsxProps
