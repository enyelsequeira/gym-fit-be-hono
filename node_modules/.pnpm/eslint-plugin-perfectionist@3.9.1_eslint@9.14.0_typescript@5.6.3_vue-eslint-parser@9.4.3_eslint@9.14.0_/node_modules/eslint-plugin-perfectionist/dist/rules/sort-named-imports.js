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
const sortNamedImports = createEslintRule.createEslintRule({
  name: 'sort-named-imports',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce sorted named imports.',
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
          ignoreAlias: {
            description: 'Controls whether to ignore alias names.',
            type: 'boolean',
          },
          groupKind: {
            description: 'Specifies top-level groups.',
            enum: ['mixed', 'values-first', 'types-first'],
            type: 'string',
          },
          partitionByComment: {
            description:
              'Allows you to use comments to separate the named imports members into logical groups.',
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
      unexpectedNamedImportsOrder:
        'Expected "{{right}}" to come before "{{left}}".',
    },
  },
  defaultOptions: [
    {
      type: 'alphabetical',
      order: 'asc',
      ignoreAlias: false,
      ignoreCase: true,
      specialCharacters: 'keep',
      partitionByNewLine: false,
      partitionByComment: false,
      groupKind: 'mixed',
    },
  ],
  create: context => ({
    ImportDeclaration: node => {
      var _a
      let specifiers = node.specifiers.filter(
        ({ type }) => type === 'ImportSpecifier',
      )
      if (specifiers.length > 1) {
        let settings = getSettings.getSettings(context.settings)
        let options = complete.complete(context.options.at(0), settings, {
          type: 'alphabetical',
          ignoreAlias: false,
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
        for (let specifier of specifiers) {
          let group
          let { name } = specifier.local
          if (specifier.type === 'ImportSpecifier' && options.ignoreAlias) {
            ;({ name } = specifier.imported)
          }
          if (
            specifier.type === 'ImportSpecifier' &&
            specifier.importKind === 'type'
          ) {
            group = 'type'
          } else {
            group = 'value'
          }
          let lastSortingNode =
            (_a = formattedMembers.at(-1)) == null ? void 0 : _a.at(-1)
          let sortingNode = {
            size: rangeToDiff.rangeToDiff(specifier.range),
            node: specifier,
            group,
            name,
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
                messageId: 'unexpectedNamedImportsOrder',
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
module.exports = sortNamedImports
