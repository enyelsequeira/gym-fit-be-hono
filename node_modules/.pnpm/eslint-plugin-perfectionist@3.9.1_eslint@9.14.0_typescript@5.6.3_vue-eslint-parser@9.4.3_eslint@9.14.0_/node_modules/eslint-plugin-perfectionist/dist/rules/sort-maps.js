'use strict'
const isPartitionComment = require('../utils/is-partition-comment.js')
const getCommentsBefore = require('../utils/get-comments-before.js')
const createEslintRule = require('../utils/create-eslint-rule.js')
const getLinesBetween = require('../utils/get-lines-between.js')
const getSourceCode = require('../utils/get-source-code.js')
const toSingleLine = require('../utils/to-single-line.js')
const rangeToDiff = require('../utils/range-to-diff.js')
const getSettings = require('../utils/get-settings.js')
const isPositive = require('../utils/is-positive.js')
const sortNodes = require('../utils/sort-nodes.js')
const makeFixes = require('../utils/make-fixes.js')
const complete = require('../utils/complete.js')
const pairwise = require('../utils/pairwise.js')
const compare = require('../utils/compare.js')
const sortMaps = createEslintRule.createEslintRule({
  name: 'sort-maps',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce sorted Map elements.',
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
          partitionByComment: {
            description:
              'Allows you to use comments to separate the maps members into logical groups.',
            anyOf: [
              {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
              {
                type: 'boolean',
              },
              {
                type: 'string',
              },
            ],
          },
          partitionByNewLine: {
            description:
              'Allows to use spaces to separate the nodes into logical groups.',
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unexpectedMapElementsOrder:
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
      partitionByComment: false,
      partitionByNewLine: false,
    },
  ],
  create: context => ({
    NewExpression: node => {
      var _a, _b
      if (
        node.callee.type === 'Identifier' &&
        node.callee.name === 'Map' &&
        node.arguments.length &&
        ((_a = node.arguments[0]) == null ? void 0 : _a.type) ===
          'ArrayExpression'
      ) {
        let [{ elements }] = node.arguments
        if (elements.length > 1) {
          let settings = getSettings.getSettings(context.settings)
          let options = complete.complete(context.options.at(0), settings, {
            type: 'alphabetical',
            ignoreCase: true,
            specialCharacters: 'keep',
            order: 'asc',
            matcher: 'minimatch',
            partitionByComment: false,
            partitionByNewLine: false,
          })
          let sourceCode = getSourceCode.getSourceCode(context)
          let partitionComment = options.partitionByComment
          let parts = elements.reduce(
            (accumulator, element) => {
              if (element === null || element.type === 'SpreadElement') {
                accumulator.push([])
              } else {
                accumulator.at(-1).push(element)
              }
              return accumulator
            },
            [[]],
          )
          for (let part of parts) {
            let formattedMembers = [[]]
            for (let element of part) {
              let name
              if (element.type === 'ArrayExpression') {
                let [left] = element.elements
                if (!left) {
                  name = `${left}`
                } else if (left.type === 'Literal') {
                  name = left.raw
                } else {
                  name = sourceCode.text.slice(...left.range)
                }
              } else {
                name = sourceCode.text.slice(...element.range)
              }
              let lastSortingNode =
                (_b = formattedMembers.at(-1)) == null ? void 0 : _b.at(-1)
              let sortingNode = {
                size: rangeToDiff.rangeToDiff(element.range),
                node: element,
                name,
              }
              if (
                (partitionComment &&
                  isPartitionComment.hasPartitionComment(
                    partitionComment,
                    getCommentsBefore.getCommentsBefore(element, sourceCode),
                    options.matcher,
                  )) ||
                (options.partitionByNewLine &&
                  lastSortingNode &&
                  getLinesBetween.getLinesBetween(
                    sourceCode,
                    lastSortingNode,
                    sortingNode,
                  ))
              ) {
                formattedMembers.push([])
              }
              formattedMembers.at(-1).push(sortingNode)
            }
            for (let nodes of formattedMembers) {
              pairwise.pairwise(nodes, (left, right) => {
                if (
                  isPositive.isPositive(compare.compare(left, right, options))
                ) {
                  context.report({
                    messageId: 'unexpectedMapElementsOrder',
                    data: {
                      left: toSingleLine.toSingleLine(left.name),
                      right: toSingleLine.toSingleLine(right.name),
                    },
                    node: right.node,
                    fix: fixer =>
                      makeFixes.makeFixes(
                        fixer,
                        nodes,
                        sortNodes.sortNodes(nodes, options),
                        sourceCode,
                        options,
                      ),
                  })
                }
              })
            }
          }
        }
      }
    },
  }),
})
module.exports = sortMaps
