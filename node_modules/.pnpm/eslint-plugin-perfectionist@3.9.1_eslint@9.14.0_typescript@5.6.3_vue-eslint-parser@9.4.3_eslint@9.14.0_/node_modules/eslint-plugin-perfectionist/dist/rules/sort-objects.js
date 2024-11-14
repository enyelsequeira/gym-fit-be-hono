'use strict'
const sortNodesByDependencies = require('../utils/sort-nodes-by-dependencies.js')
const validateGroupsConfiguration = require('../utils/validate-groups-configuration.js')
const isPartitionComment = require('../utils/is-partition-comment.js')
const sortNodesByGroups = require('../utils/sort-nodes-by-groups.js')
const getCommentsBefore = require('../utils/get-comments-before.js')
const createEslintRule = require('../utils/create-eslint-rule.js')
const getLinesBetween = require('../utils/get-lines-between.js')
const getGroupNumber = require('../utils/get-group-number.js')
const getSourceCode = require('../utils/get-source-code.js')
const getNodeParent = require('../utils/get-node-parent.js')
const toSingleLine = require('../utils/to-single-line.js')
const rangeToDiff = require('../utils/range-to-diff.js')
const getSettings = require('../utils/get-settings.js')
const useGroups = require('../utils/use-groups.js')
const makeFixes = require('../utils/make-fixes.js')
const complete = require('../utils/complete.js')
const pairwise = require('../utils/pairwise.js')
const matches = require('../utils/matches.js')
const sortObjects = createEslintRule.createEslintRule({
  name: 'sort-objects',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce sorted objects.',
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
              'Allows you to use comments to separate the keys of objects into logical groups.',
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
          styledComponents: {
            description: 'Controls whether to sort styled components.',
            type: 'boolean',
          },
          destructureOnly: {
            description: 'Controls whether to sort only destructured objects.',
            type: 'boolean',
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
      unexpectedObjectsGroupOrder:
        'Expected "{{right}}" ({{rightGroup}}) to come before "{{left}}" ({{leftGroup}}).',
      unexpectedObjectsOrder: 'Expected "{{right}}" to come before "{{left}}".',
      unexpectedObjectsDependencyOrder:
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
      styledComponents: true,
      destructureOnly: false,
      ignorePattern: [],
      groups: [],
      customGroups: {},
    },
  ],
  create: context => {
    let sortObject = node => {
      let settings = getSettings.getSettings(context.settings)
      let options = complete.complete(context.options.at(0), settings, {
        partitionByNewLine: false,
        partitionByComment: false,
        styledComponents: true,
        destructureOnly: false,
        type: 'alphabetical',
        ignorePattern: [],
        matcher: 'minimatch',
        ignoreCase: true,
        specialCharacters: 'keep',
        customGroups: {},
        order: 'asc',
        groups: [],
      })
      validateGroupsConfiguration.validateGroupsConfiguration(
        options.groups,
        ['unknown'],
        Object.keys(options.customGroups),
      )
      let shouldIgnore = false
      if (options.destructureOnly) {
        shouldIgnore = node.type !== 'ObjectPattern'
      }
      if (!shouldIgnore && options.ignorePattern.length) {
        let varParent = getNodeParent.getNodeParent(node, [
          'VariableDeclarator',
          'Property',
        ])
        let parentId =
          (varParent == null ? void 0 : varParent.type) === 'VariableDeclarator'
            ? varParent.id
            : varParent == null
              ? void 0
              : varParent.key
        let varIdentifier =
          (parentId == null ? void 0 : parentId.type) === 'Identifier'
            ? parentId.name
            : null
        let checkMatch = identifier =>
          options.ignorePattern.some(pattern =>
            matches.matches(identifier, pattern, options.matcher),
          )
        if (typeof varIdentifier === 'string' && checkMatch(varIdentifier)) {
          shouldIgnore = true
        }
        let callParent = getNodeParent.getNodeParent(node, ['CallExpression'])
        let callIdentifier =
          (callParent == null ? void 0 : callParent.type) ===
            'CallExpression' && callParent.callee.type === 'Identifier'
            ? callParent.callee.name
            : null
        if (callIdentifier && checkMatch(callIdentifier)) {
          shouldIgnore = true
        }
      }
      if (!shouldIgnore && node.properties.length > 1) {
        let isStyledCallExpression = identifier =>
          identifier.type === 'Identifier' && identifier.name === 'styled'
        let isCssCallExpression = identifier =>
          identifier.type === 'Identifier' && identifier.name === 'css'
        let isStyledComponents = styledNode =>
          styledNode !== void 0 &&
          ((styledNode.type === 'CallExpression' &&
            (isCssCallExpression(styledNode.callee) ||
              (styledNode.callee.type === 'MemberExpression' &&
                isStyledCallExpression(styledNode.callee.object)) ||
              (styledNode.callee.type === 'CallExpression' &&
                isStyledCallExpression(styledNode.callee.callee)))) ||
            (styledNode.type === 'JSXExpressionContainer' &&
              styledNode.parent.type === 'JSXAttribute' &&
              styledNode.parent.name.name === 'style'))
        if (
          !options.styledComponents &&
          (isStyledComponents(node.parent) ||
            (node.parent.type === 'ArrowFunctionExpression' &&
              isStyledComponents(node.parent.parent)))
        ) {
          return
        }
        let sourceCode = getSourceCode.getSourceCode(context)
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
        let formatProperties = props =>
          props.reduce(
            (accumulator, prop) => {
              var _a
              if (
                prop.type === 'SpreadElement' ||
                prop.type === 'RestElement'
              ) {
                accumulator.push([])
                return accumulator
              }
              let comments = getCommentsBefore.getCommentsBefore(
                prop,
                sourceCode,
              )
              let lastProp =
                (_a = accumulator.at(-1)) == null ? void 0 : _a.at(-1)
              if (
                options.partitionByComment &&
                isPartitionComment.hasPartitionComment(
                  options.partitionByComment,
                  comments,
                  options.matcher,
                )
              ) {
                accumulator.push([])
              }
              let name
              let position = 'ignore'
              let dependencies = []
              let { getGroup, setCustomGroups } = useGroups.useGroups(options)
              if (prop.key.type === 'Identifier') {
                ;({ name } = prop.key)
              } else if (prop.key.type === 'Literal') {
                name = `${prop.key.value}`
              } else {
                name = sourceCode.text.slice(...prop.key.range)
              }
              let propSortingNode = {
                size: rangeToDiff.rangeToDiff(prop.range),
                node: prop,
                name,
              }
              if (
                options.partitionByNewLine &&
                lastProp &&
                getLinesBetween.getLinesBetween(
                  sourceCode,
                  lastProp,
                  propSortingNode,
                )
              ) {
                accumulator.push([])
              }
              if (prop.value.type === 'AssignmentPattern') {
                dependencies = extractDependencies(prop.value)
              }
              setCustomGroups(options.customGroups, name)
              let value = {
                ...propSortingNode,
                group: getGroup(),
                dependencies,
                position,
              }
              accumulator.at(-1).push(value)
              return accumulator
            },
            [[]],
          )
        let formattedMembers = formatProperties(node.properties)
        let sortedNodes = sortNodesByDependencies.sortNodesByDependencies(
          formattedMembers
            .map(nodes2 => sortNodesByGroups.sortNodesByGroups(nodes2, options))
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
            let leftNum = getGroupNumber.getGroupNumber(options.groups, left)
            let rightNum = getGroupNumber.getGroupNumber(options.groups, right)
            let messageId
            if (firstUnorderedNodeDependentOnRight) {
              messageId = 'unexpectedObjectsDependencyOrder'
            } else {
              messageId =
                leftNum !== rightNum
                  ? 'unexpectedObjectsGroupOrder'
                  : 'unexpectedObjectsOrder'
            }
            context.report({
              messageId,
              data: {
                left: toSingleLine.toSingleLine(left.name),
                leftGroup: left.group,
                right: toSingleLine.toSingleLine(right.name),
                rightGroup: right.group,
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
    }
    return {
      ObjectExpression: sortObject,
      ObjectPattern: sortObject,
    }
  },
})
module.exports = sortObjects
