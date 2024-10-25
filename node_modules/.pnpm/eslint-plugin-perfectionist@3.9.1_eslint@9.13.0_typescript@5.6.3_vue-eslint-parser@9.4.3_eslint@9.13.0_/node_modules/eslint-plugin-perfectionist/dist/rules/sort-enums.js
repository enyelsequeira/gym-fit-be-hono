'use strict'
const sortNodesByDependencies = require('../utils/sort-nodes-by-dependencies.js')
const isPartitionComment = require('../utils/is-partition-comment.js')
const getCommentsBefore = require('../utils/get-comments-before.js')
const createEslintRule = require('../utils/create-eslint-rule.js')
const getLinesBetween = require('../utils/get-lines-between.js')
const getSourceCode = require('../utils/get-source-code.js')
const toSingleLine = require('../utils/to-single-line.js')
const rangeToDiff = require('../utils/range-to-diff.js')
const getSettings = require('../utils/get-settings.js')
const sortNodes = require('../utils/sort-nodes.js')
const makeFixes = require('../utils/make-fixes.js')
const complete = require('../utils/complete.js')
const pairwise = require('../utils/pairwise.js')
const sortEnums = createEslintRule.createEslintRule({
  name: 'sort-enums',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce sorted TypeScript enums.',
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
          sortByValue: {
            description: 'Compare enum values instead of names.',
            type: 'boolean',
          },
          forceNumericSort: {
            description:
              'Will always sort numeric enums by their value regardless of the sort type specified.',
            type: 'boolean',
          },
          partitionByComment: {
            description:
              'Allows you to use comments to separate the members of enums into logical groups.',
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
      unexpectedEnumsOrder: 'Expected "{{right}}" to come before "{{left}}".',
      unexpectedEnumsDependencyOrder:
        'Expected dependency "{{right}}" to come before "{{nodeDependentOnRight}}".',
    },
  },
  defaultOptions: [
    {
      type: 'alphabetical',
      order: 'asc',
      ignoreCase: true,
      specialCharacters: 'keep',
      matcher: 'minimatch',
      sortByValue: false,
      partitionByComment: false,
      partitionByNewLine: false,
      forceNumericSort: false,
    },
  ],
  create: context => ({
    TSEnumDeclaration: node => {
      let getMembers = nodeValue => {
        var _a
        return (
          /* v8 ignore next 2 */
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          ((_a = node.body) == null ? void 0 : _a.members) ??
          nodeValue.members ??
          []
        )
      }
      let members = getMembers(node)
      if (
        members.length > 1 &&
        members.every(({ initializer }) => initializer)
      ) {
        let settings = getSettings.getSettings(context.settings)
        let options = complete.complete(context.options.at(0), settings, {
          partitionByComment: false,
          partitionByNewLine: false,
          type: 'alphabetical',
          matcher: 'minimatch',
          ignoreCase: true,
          specialCharacters: 'keep',
          order: 'asc',
          sortByValue: false,
          forceNumericSort: false,
        })
        let sourceCode = getSourceCode.getSourceCode(context)
        let partitionComment = options.partitionByComment
        let extractDependencies = (expression, enumName) => {
          let dependencies = []
          let checkNode = nodeValue => {
            if (
              nodeValue.type === 'MemberExpression' &&
              nodeValue.object.type === 'Identifier' &&
              nodeValue.object.name === enumName &&
              nodeValue.property.type === 'Identifier'
            ) {
              dependencies.push(nodeValue.property.name)
            } else if (nodeValue.type === 'Identifier') {
              dependencies.push(nodeValue.name)
            }
            if ('left' in nodeValue) {
              checkNode(nodeValue.left)
            }
            if ('right' in nodeValue) {
              checkNode(nodeValue.right)
            }
            if ('expressions' in nodeValue) {
              nodeValue.expressions.forEach(checkNode)
            }
          }
          checkNode(expression)
          return dependencies
        }
        let formattedMembers = members.reduce(
          (accumulator, member) => {
            var _a
            let dependencies = []
            if (member.initializer) {
              dependencies = extractDependencies(
                member.initializer,
                node.id.name,
              )
            }
            let lastSortingNode =
              (_a = accumulator.at(-1)) == null ? void 0 : _a.at(-1)
            let sortingNode = {
              size: rangeToDiff.rangeToDiff(member.range),
              node: member,
              dependencies,
              name:
                member.id.type === 'Literal'
                  ? `${member.id.value}`
                  : `${sourceCode.text.slice(...member.id.range)}`,
            }
            if (
              (partitionComment &&
                isPartitionComment.hasPartitionComment(
                  partitionComment,
                  getCommentsBefore.getCommentsBefore(member, sourceCode),
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
              accumulator.push([])
            }
            accumulator.at(-1).push(sortingNode)
            return accumulator
          },
          [[]],
        )
        let isNumericEnum = members.every(member => {
          var _a
          return (
            ((_a = member.initializer) == null ? void 0 : _a.type) ===
              'Literal' && typeof member.initializer.value === 'number'
          )
        })
        let compareOptions = {
          // If the enum is numeric, and we sort by value, always use the `natural` sort type, which will correctly sort them.
          type:
            isNumericEnum && (options.forceNumericSort || options.sortByValue)
              ? 'natural'
              : options.type,
          order: options.order,
          ignoreCase: options.ignoreCase,
          specialCharacters: options.specialCharacters,
          // Get the enum value rather than the name if needed
          nodeValueGetter:
            options.sortByValue || (isNumericEnum && options.forceNumericSort)
              ? sortingNode => {
                  var _a, _b
                  if (
                    sortingNode.node.type === 'TSEnumMember' &&
                    ((_a = sortingNode.node.initializer) == null
                      ? void 0
                      : _a.type) === 'Literal'
                  ) {
                    return (
                      ((_b = sortingNode.node.initializer.value) == null
                        ? void 0
                        : _b.toString()) ?? ''
                    )
                  }
                  return ''
                }
              : void 0,
        }
        let sortedNodes = sortNodesByDependencies.sortNodesByDependencies(
          formattedMembers
            .map(nodes2 => sortNodes.sortNodes(nodes2, compareOptions))
            .flat(),
        )
        let nodes = formattedMembers.flat()
        pairwise.pairwise(nodes, (left, right) => {
          let indexOfLeft = sortedNodes.indexOf(left)
          let indexOfRight = sortedNodes.indexOf(right)
          if (indexOfLeft > indexOfRight) {
            let firstUnorderedNodeDependentOnRight =
              sortNodesByDependencies.getFirstUnorderedNodeDependentOn(
                right,
                nodes,
              )
            context.report({
              messageId: firstUnorderedNodeDependentOnRight
                ? 'unexpectedEnumsDependencyOrder'
                : 'unexpectedEnumsOrder',
              data: {
                left: toSingleLine.toSingleLine(left.name),
                right: toSingleLine.toSingleLine(right.name),
                nodeDependentOnRight:
                  firstUnorderedNodeDependentOnRight == null
                    ? void 0
                    : firstUnorderedNodeDependentOnRight.name,
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
  }),
})
module.exports = sortEnums
