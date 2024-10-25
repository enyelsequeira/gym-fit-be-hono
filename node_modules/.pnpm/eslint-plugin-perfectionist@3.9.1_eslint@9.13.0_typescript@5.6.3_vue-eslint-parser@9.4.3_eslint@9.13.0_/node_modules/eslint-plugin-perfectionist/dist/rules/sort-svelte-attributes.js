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
const complete = require('../utils/complete.js')
const pairwise = require('../utils/pairwise.js')
const sortSvelteAttributes = createEslintRule.createEslintRule({
  name: 'sort-svelte-attributes',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce sorted Svelte attributes.',
    },
    fixable: 'code',
    deprecated: true,
    replacedBy: ['svelte/sort-attributes'],
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
      unexpectedSvelteAttributesGroupOrder:
        'Expected "{{right}}" ({{rightGroup}}) to come before "{{left}}" ({{leftGroup}}).',
      unexpectedSvelteAttributesOrder:
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
    if (path.extname(context.filename) !== '.svelte') {
      return {}
    }
    return {
      SvelteStartTag: node => {
        if (node.attributes.length > 1) {
          let settings = getSettings.getSettings(context.settings)
          let options = complete.complete(context.options.at(0), settings, {
            type: 'alphabetical',
            ignoreCase: true,
            specialCharacters: 'keep',
            customGroups: {},
            matcher: 'minimatch',
            order: 'asc',
            groups: [],
          })
          validateGroupsConfiguration.validateGroupsConfiguration(
            options.groups,
            ['svelte-shorthand', 'multiline', 'shorthand', 'unknown'],
            Object.keys(options.customGroups),
          )
          let sourceCode = getSourceCode.getSourceCode(context)
          let parts = node.attributes.reduce(
            (accumulator, attribute) => {
              if (attribute.type === 'SvelteSpreadAttribute') {
                accumulator.push([])
                return accumulator
              }
              let name
              let { getGroup, defineGroup, setCustomGroups } =
                useGroups.useGroups(options)
              if (attribute.key.type === 'SvelteSpecialDirectiveKey') {
                name = sourceCode.text.slice(...attribute.key.range)
              } else if (typeof attribute.key.name === 'string') {
                ;({ name } = attribute.key)
              } else {
                name = sourceCode.text.slice(...attribute.key.range)
              }
              setCustomGroups(options.customGroups, name)
              if (attribute.type === 'SvelteShorthandAttribute') {
                defineGroup('svelte-shorthand')
                defineGroup('shorthand')
              }
              if (
                !('value' in attribute) ||
                (Array.isArray(attribute.value) && !attribute.value.at(0))
              ) {
                defineGroup('shorthand')
              }
              if (attribute.loc.start.line !== attribute.loc.end.line) {
                defineGroup('multiline')
              }
              accumulator.at(-1).push({
                node: attribute,
                size: rangeToDiff.rangeToDiff(attribute.range),
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
                      ? 'unexpectedSvelteAttributesGroupOrder'
                      : 'unexpectedSvelteAttributesOrder',
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
      },
    }
  },
})
module.exports = sortSvelteAttributes
