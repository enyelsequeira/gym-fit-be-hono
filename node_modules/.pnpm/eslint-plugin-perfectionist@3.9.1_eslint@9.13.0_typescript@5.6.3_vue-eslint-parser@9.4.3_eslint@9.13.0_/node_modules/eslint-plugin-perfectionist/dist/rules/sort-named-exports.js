'use strict'
const isPartitionComment = require('../utils/is-partition-comment.js')
const getCommentsBefore = require('../utils/get-comments-before.js')
const createEslintRule = require('../utils/create-eslint-rule.js')
const getLinesBetween = require('../utils/get-lines-between.js')
const getGroupNumber = require('../utils/get-group-number.js')
const getSourceCode = require('../utils/get-source-code.js')
const rangeToDiff = require('../utils/range-to-diff.js')
const getSettings = require('../utils/get-settings.js')
const isPositive = require('../utils/is-positive.js')
const sortNodes = require('../utils/sort-nodes.js')
const makeFixes = require('../utils/make-fixes.js')
const complete = require('../utils/complete.js')
const pairwise = require('../utils/pairwise.js')
const compare = require('../utils/compare.js')
const sortNamedExports = createEslintRule.createEslintRule({
  name: 'sort-named-exports',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce sorted named exports.',
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
          groupKind: {
            description: 'Specifies top-level groups.',
            enum: ['mixed', 'values-first', 'types-first'],
            type: 'string',
          },
          partitionByComment: {
            description:
              'Allows you to use comments to separate the named exports members into logical groups.',
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
      unexpectedNamedExportsOrder:
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
      partitionByNewLine: false,
      partitionByComment: false,
      groupKind: 'mixed',
    },
  ],
  create: context => ({
    ExportNamedDeclaration: node => {
      var _a
      if (node.specifiers.length > 1) {
        let settings = getSettings.getSettings(context.settings)
        let options = complete.complete(context.options.at(0), settings, {
          type: 'alphabetical',
          groupKind: 'mixed',
          ignoreCase: true,
          specialCharacters: 'keep',
          matcher: 'minimatch',
          partitionByNewLine: false,
          partitionByComment: false,
          order: 'asc',
        })
        let sourceCode = getSourceCode.getSourceCode(context)
        let partitionComment = options.partitionByComment
        let formattedMembers = [[]]
        for (let specifier of node.specifiers) {
          let group
          if (specifier.exportKind === 'type') {
            group = 'type'
          } else {
            group = 'value'
          }
          let lastSortingNode =
            (_a = formattedMembers.at(-1)) == null ? void 0 : _a.at(-1)
          let sortingNode = {
            size: rangeToDiff.rangeToDiff(specifier.range),
            name: specifier.local.name,
            node: specifier,
            group,
          }
          if (
            (partitionComment &&
              isPartitionComment.hasPartitionComment(
                partitionComment,
                getCommentsBefore.getCommentsBefore(specifier, sourceCode),
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
        let shouldGroupByKind = options.groupKind !== 'mixed'
        let groupKindOrder =
          options.groupKind === 'values-first'
            ? ['value', 'type']
            : ['type', 'value']
        for (let nodes of formattedMembers) {
          pairwise.pairwise(nodes, (left, right) => {
            let leftNum = getGroupNumber.getGroupNumber(groupKindOrder, left)
            let rightNum = getGroupNumber.getGroupNumber(groupKindOrder, right)
            if (
              (shouldGroupByKind && leftNum > rightNum) ||
              ((!shouldGroupByKind || leftNum === rightNum) &&
                isPositive.isPositive(compare.compare(left, right, options)))
            ) {
              let sortedNodes = shouldGroupByKind
                ? groupKindOrder
                    .map(group => nodes.filter(n => n.group === group))
                    .map(groupedNodes =>
                      sortNodes.sortNodes(groupedNodes, options),
                    )
                    .flat()
                : sortNodes.sortNodes(nodes, options)
              context.report({
                messageId: 'unexpectedNamedExportsOrder',
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
      }
    },
  }),
})
module.exports = sortNamedExports
