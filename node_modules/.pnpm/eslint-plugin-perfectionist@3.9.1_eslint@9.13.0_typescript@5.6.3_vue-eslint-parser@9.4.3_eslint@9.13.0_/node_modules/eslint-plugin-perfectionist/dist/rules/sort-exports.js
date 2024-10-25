'use strict'
const isPartitionComment = require('../utils/is-partition-comment.js')
const getCommentsBefore = require('../utils/get-comments-before.js')
const createEslintRule = require('../utils/create-eslint-rule.js')
const getLinesBetween = require('../utils/get-lines-between.js')
const getSourceCode = require('../utils/get-source-code.js')
const rangeToDiff = require('../utils/range-to-diff.js')
const getSettings = require('../utils/get-settings.js')
const sortNodes = require('../utils/sort-nodes.js')
const makeFixes = require('../utils/make-fixes.js')
const complete = require('../utils/complete.js')
const pairwise = require('../utils/pairwise.js')
const sortExports = createEslintRule.createEslintRule({
  name: 'sort-exports',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce sorted exports.',
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
              'Allows you to use comments to separate the exports into logical groups.',
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
          groupKind: {
            description: 'Specifies top-level groups.',
            type: 'string',
            enum: ['mixed', 'values-first', 'types-first'],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unexpectedExportsOrder: 'Expected "{{right}}" to come before "{{left}}".',
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
      groupKind: 'mixed',
    },
  ],
  create: context => {
    let settings = getSettings.getSettings(context.settings)
    let options = complete.complete(context.options.at(0), settings, {
      type: 'alphabetical',
      ignoreCase: true,
      specialCharacters: 'keep',
      order: 'asc',
      matcher: 'minimatch',
      partitionByComment: false,
      partitionByNewLine: false,
      groupKind: 'mixed',
    })
    let sourceCode = getSourceCode.getSourceCode(context)
    let partitionComment = options.partitionByComment
    let parts = [[]]
    let registerNode = node => {
      var _a
      let sortingNode = {
        size: rangeToDiff.rangeToDiff(node.range),
        name: node.source.value,
        node,
      }
      let lastNode = (_a = parts.at(-1)) == null ? void 0 : _a.at(-1)
      if (
        (partitionComment &&
          isPartitionComment.hasPartitionComment(
            partitionComment,
            getCommentsBefore.getCommentsBefore(node, sourceCode),
            options.matcher,
          )) ||
        (options.partitionByNewLine &&
          lastNode &&
          getLinesBetween.getLinesBetween(sourceCode, lastNode, sortingNode))
      ) {
        parts.push([])
      }
      parts.at(-1).push(sortingNode)
    }
    return {
      ExportAllDeclaration: registerNode,
      ExportNamedDeclaration: node => {
        if (node.source !== null) {
          registerNode(node)
        }
      },
      'Program:exit': () => {
        for (let nodes of parts) {
          let groupedByKind
          if (options.groupKind !== 'mixed') {
            groupedByKind = nodes.reduce(
              (accumulator, currentNode) => {
                let exportTypeIndex =
                  options.groupKind === 'types-first' ? 0 : 1
                let exportIndex = options.groupKind === 'types-first' ? 1 : 0
                if (currentNode.node.exportKind === 'value') {
                  accumulator[exportIndex].push(currentNode)
                } else {
                  accumulator[exportTypeIndex].push(currentNode)
                }
                return accumulator
              },
              [[], []],
            )
          } else {
            groupedByKind = [nodes]
          }
          let sortedNodes = []
          for (let nodesByKind of groupedByKind) {
            sortedNodes = [
              ...sortedNodes,
              ...sortNodes.sortNodes(nodesByKind, options),
            ]
          }
          pairwise.pairwise(nodes, (left, right) => {
            let indexOfLeft = sortedNodes.indexOf(left)
            let indexOfRight = sortedNodes.indexOf(right)
            if (indexOfLeft > indexOfRight) {
              context.report({
                messageId: 'unexpectedExportsOrder',
                data: {
                  left: left.name,
                  right: right.name,
                },
                node: right.node,
                fix: fixer =>
                  makeFixes.makeFixes(
                    fixer,
                    nodes,
                    sortedNodes,
                    sourceCode,
                    options,
                  ),
              })
            }
          })
        }
      },
    }
  },
})
module.exports = sortExports
