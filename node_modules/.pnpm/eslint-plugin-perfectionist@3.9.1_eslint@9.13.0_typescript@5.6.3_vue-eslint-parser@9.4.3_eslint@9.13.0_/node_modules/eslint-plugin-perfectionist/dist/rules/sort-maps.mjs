import { hasPartitionComment } from '../utils/is-partition-comment.mjs'
import { getCommentsBefore } from '../utils/get-comments-before.mjs'
import { createEslintRule } from '../utils/create-eslint-rule.mjs'
import { getLinesBetween } from '../utils/get-lines-between.mjs'
import { getSourceCode } from '../utils/get-source-code.mjs'
import { toSingleLine } from '../utils/to-single-line.mjs'
import { rangeToDiff } from '../utils/range-to-diff.mjs'
import { getSettings } from '../utils/get-settings.mjs'
import { isPositive } from '../utils/is-positive.mjs'
import { sortNodes } from '../utils/sort-nodes.mjs'
import { makeFixes } from '../utils/make-fixes.mjs'
import { complete } from '../utils/complete.mjs'
import { pairwise } from '../utils/pairwise.mjs'
import { compare } from '../utils/compare.mjs'
const sortMaps = createEslintRule({
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
          let settings = getSettings(context.settings)
          let options = complete(context.options.at(0), settings, {
            type: 'alphabetical',
            ignoreCase: true,
            specialCharacters: 'keep',
            order: 'asc',
            matcher: 'minimatch',
            partitionByComment: false,
            partitionByNewLine: false,
          })
          let sourceCode = getSourceCode(context)
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
                size: rangeToDiff(element.range),
                node: element,
                name,
              }
              if (
                (partitionComment &&
                  hasPartitionComment(
                    partitionComment,
                    getCommentsBefore(element, sourceCode),
                    options.matcher,
                  )) ||
                (options.partitionByNewLine &&
                  lastSortingNode &&
                  getLinesBetween(sourceCode, lastSortingNode, sortingNode))
              ) {
                formattedMembers.push([])
              }
              formattedMembers.at(-1).push(sortingNode)
            }
            for (let nodes of formattedMembers) {
              pairwise(nodes, (left, right) => {
                if (isPositive(compare(left, right, options))) {
                  context.report({
                    messageId: 'unexpectedMapElementsOrder',
                    data: {
                      left: toSingleLine(left.name),
                      right: toSingleLine(right.name),
                    },
                    node: right.node,
                    fix: fixer =>
                      makeFixes(
                        fixer,
                        nodes,
                        sortNodes(nodes, options),
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
export { sortMaps as default }
