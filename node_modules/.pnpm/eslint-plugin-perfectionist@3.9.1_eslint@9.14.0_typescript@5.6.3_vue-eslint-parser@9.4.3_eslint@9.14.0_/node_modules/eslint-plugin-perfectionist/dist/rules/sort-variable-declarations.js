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
const sortVariableDeclarations = createEslintRule.createEslintRule({
  name: 'sort-variable-declarations',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce sorted variable declarations.',
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
              'Allows you to use comments to separate the variable declarations into logical groups.',
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
      unexpectedVariableDeclarationsOrder:
        'Expected "{{right}}" to come before "{{left}}".',
      unexpectedVariableDeclarationsDependencyOrder:
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
      partitionByComment: false,
      partitionByNewLine: false,
    },
  ],
  create: context => ({
    VariableDeclaration: node => {
      if (node.declarations.length > 1) {
        let settings = getSettings.getSettings(context.settings)
        let options = complete.complete(context.options.at(0), settings, {
          type: 'alphabetical',
          ignoreCase: true,
          specialCharacters: 'keep',
          partitionByNewLine: false,
          matcher: 'minimatch',
          partitionByComment: false,
          order: 'asc',
        })
        let sourceCode = getSourceCode.getSourceCode(context)
        let partitionComment = options.partitionByComment
        let extractDependencies = init => {
          let dependencies = []
          let checkNode = nodeValue => {
            if (
              nodeValue.type === 'ArrowFunctionExpression' ||
              nodeValue.type === 'FunctionExpression'
            ) {
              return
            }
            if (nodeValue.type === 'Identifier') {
              dependencies.push(nodeValue.name)
            }
            if (nodeValue.type === 'Property') {
              traverseNode(nodeValue.key)
              traverseNode(nodeValue.value)
            }
            if (nodeValue.type === 'ConditionalExpression') {
              traverseNode(nodeValue.test)
              traverseNode(nodeValue.consequent)
              traverseNode(nodeValue.alternate)
            }
            if (
              'expression' in nodeValue &&
              typeof nodeValue.expression !== 'boolean'
            ) {
              traverseNode(nodeValue.expression)
            }
            if ('object' in nodeValue) {
              traverseNode(nodeValue.object)
            }
            if ('callee' in nodeValue) {
              traverseNode(nodeValue.callee)
            }
            if ('left' in nodeValue) {
              traverseNode(nodeValue.left)
            }
            if ('right' in nodeValue) {
              traverseNode(nodeValue.right)
            }
            if ('elements' in nodeValue) {
              nodeValue.elements
                .filter(currentNode => currentNode !== null)
                .forEach(traverseNode)
            }
            if ('argument' in nodeValue && nodeValue.argument) {
              traverseNode(nodeValue.argument)
            }
            if ('arguments' in nodeValue) {
              nodeValue.arguments.forEach(traverseNode)
            }
            if ('properties' in nodeValue) {
              nodeValue.properties.forEach(traverseNode)
            }
            if ('expressions' in nodeValue) {
              nodeValue.expressions.forEach(traverseNode)
            }
          }
          let traverseNode = nodeValue => {
            checkNode(nodeValue)
          }
          traverseNode(init)
          return dependencies
        }
        let formattedMembers = node.declarations.reduce(
          (accumulator, declaration) => {
            var _a, _b
            let name
            if (
              declaration.id.type === 'ArrayPattern' ||
              declaration.id.type === 'ObjectPattern'
            ) {
              name = sourceCode.text.slice(...declaration.id.range)
            } else {
              ;({ name } = declaration.id)
            }
            let dependencies = []
            if (declaration.init) {
              dependencies = extractDependencies(declaration.init)
            }
            let lastSortingNode =
              (_a = accumulator.at(-1)) == null ? void 0 : _a.at(-1)
            let sortingNode = {
              size: rangeToDiff.rangeToDiff(declaration.range),
              node: declaration,
              dependencies,
              name,
            }
            if (
              (partitionComment &&
                isPartitionComment.hasPartitionComment(
                  partitionComment,
                  getCommentsBefore.getCommentsBefore(declaration, sourceCode),
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
            ;(_b = accumulator.at(-1)) == null ? void 0 : _b.push(sortingNode)
            return accumulator
          },
          [[]],
        )
        let sortedNodes = sortNodesByDependencies.sortNodesByDependencies(
          formattedMembers
            .map(nodes2 => sortNodes.sortNodes(nodes2, options))
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
                ? 'unexpectedVariableDeclarationsDependencyOrder'
                : 'unexpectedVariableDeclarationsOrder',
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
module.exports = sortVariableDeclarations
