import {
  sortNodesByDependencies,
  getFirstUnorderedNodeDependentOn,
} from '../utils/sort-nodes-by-dependencies.mjs'
import { validateGroupsConfiguration } from '../utils/validate-groups-configuration.mjs'
import { hasPartitionComment } from '../utils/is-partition-comment.mjs'
import { sortNodesByGroups } from '../utils/sort-nodes-by-groups.mjs'
import { getCommentsBefore } from '../utils/get-comments-before.mjs'
import { createEslintRule } from '../utils/create-eslint-rule.mjs'
import { getLinesBetween } from '../utils/get-lines-between.mjs'
import { getGroupNumber } from '../utils/get-group-number.mjs'
import { getSourceCode } from '../utils/get-source-code.mjs'
import { getNodeParent } from '../utils/get-node-parent.mjs'
import { toSingleLine } from '../utils/to-single-line.mjs'
import { rangeToDiff } from '../utils/range-to-diff.mjs'
import { getSettings } from '../utils/get-settings.mjs'
import { useGroups } from '../utils/use-groups.mjs'
import { makeFixes } from '../utils/make-fixes.mjs'
import { complete } from '../utils/complete.mjs'
import { pairwise } from '../utils/pairwise.mjs'
import { matches } from '../utils/matches.mjs'
const sortObjects = createEslintRule({
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
      let settings = getSettings(context.settings)
      let options = complete(context.options.at(0), settings, {
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
      validateGroupsConfiguration(
        options.groups,
        ['unknown'],
        Object.keys(options.customGroups),
      )
      let shouldIgnore = false
      if (options.destructureOnly) {
        shouldIgnore = node.type !== 'ObjectPattern'
      }
      if (!shouldIgnore && options.ignorePattern.length) {
        let varParent = getNodeParent(node, ['VariableDeclarator', 'Property'])
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
            matches(identifier, pattern, options.matcher),
          )
        if (typeof varIdentifier === 'string' && checkMatch(varIdentifier)) {
          shouldIgnore = true
        }
        let callParent = getNodeParent(node, ['CallExpression'])
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
        let sourceCode = getSourceCode(context)
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
              let comments = getCommentsBefore(prop, sourceCode)
              let lastProp =
                (_a = accumulator.at(-1)) == null ? void 0 : _a.at(-1)
              if (
                options.partitionByComment &&
                hasPartitionComment(
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
              let { getGroup, setCustomGroups } = useGroups(options)
              if (prop.key.type === 'Identifier') {
                ;({ name } = prop.key)
              } else if (prop.key.type === 'Literal') {
                name = `${prop.key.value}`
              } else {
                name = sourceCode.text.slice(...prop.key.range)
              }
              let propSortingNode = {
                size: rangeToDiff(prop.range),
                node: prop,
                name,
              }
              if (
                options.partitionByNewLine &&
                lastProp &&
                getLinesBetween(sourceCode, lastProp, propSortingNode)
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
        let sortedNodes = sortNodesByDependencies(
          formattedMembers
            .map(nodes2 => sortNodesByGroups(nodes2, options))
            .flat(),
        )
        let nodes = formattedMembers.flat()
        pairwise(nodes, (left, right) => {
          let indexOfLeft = sortedNodes.indexOf(left)
          let indexOfRight = sortedNodes.indexOf(right)
          if (indexOfLeft > indexOfRight) {
            let firstUnorderedNodeDependentOnRight =
              getFirstUnorderedNodeDependentOn(right, nodes)
            let leftNum = getGroupNumber(options.groups, left)
            let rightNum = getGroupNumber(options.groups, right)
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
                left: toSingleLine(left.name),
                leftGroup: left.group,
                right: toSingleLine(right.name),
                rightGroup: right.group,
                nodeDependentOnRight:
                  firstUnorderedNodeDependentOnRight == null
                    ? void 0
                    : firstUnorderedNodeDependentOnRight.name,
              },
              node: right.node,
              fix: fixer =>
                makeFixes(fixer, nodes, sortedNodes, sourceCode, options),
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
export { sortObjects as default }
