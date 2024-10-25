'use strict'
const validateGroupsConfiguration = require('../utils/validate-groups-configuration.js')
const isPartitionComment = require('../utils/is-partition-comment.js')
const sortNodesByGroups = require('../utils/sort-nodes-by-groups.js')
const getCommentsBefore = require('../utils/get-comments-before.js')
const createEslintRule = require('../utils/create-eslint-rule.js')
const isMemberOptional = require('../utils/is-member-optional.js')
const getLinesBetween = require('../utils/get-lines-between.js')
const getGroupNumber = require('../utils/get-group-number.js')
const getSourceCode = require('../utils/get-source-code.js')
const toSingleLine = require('../utils/to-single-line.js')
const rangeToDiff = require('../utils/range-to-diff.js')
const getSettings = require('../utils/get-settings.js')
const useGroups = require('../utils/use-groups.js')
const makeFixes = require('../utils/make-fixes.js')
const complete = require('../utils/complete.js')
const pairwise = require('../utils/pairwise.js')
const matches = require('../utils/matches.js')
const sortInterfaces = createEslintRule.createEslintRule({
  name: 'sort-interfaces',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce sorted interface properties.',
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
          ignorePattern: {
            description:
              'Specifies names or patterns for nodes that should be ignored by rule.',
            items: {
              type: 'string',
            },
            type: 'array',
          },
          partitionByComment: {
            description:
              'Allows you to use comments to separate the interface properties into logical groups.',
            anyOf: [
              {
                type: 'boolean',
              },
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
          partitionByNewLine: {
            description:
              'Allows to use spaces to separate the nodes into logical groups.',
            type: 'boolean',
          },
          groupKind: {
            description: 'Specifies the order of optional and required nodes.',
            enum: ['mixed', 'optional-first', 'required-first'],
            type: 'string',
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
      unexpectedInterfacePropertiesGroupOrder:
        'Expected "{{right}}" ({{rightGroup}}) to come before "{{left}}" ({{leftGroup}}).',
      unexpectedInterfacePropertiesOrder:
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
      ignorePattern: [],
      partitionByComment: false,
      partitionByNewLine: false,
      groupKind: 'mixed',
      groups: [],
      customGroups: {},
    },
  ],
  create: context => ({
    TSInterfaceDeclaration: node => {
      if (node.body.body.length > 1) {
        let settings = getSettings.getSettings(context.settings)
        let options = complete.complete(context.options.at(0), settings, {
          partitionByComment: false,
          partitionByNewLine: false,
          type: 'alphabetical',
          groupKind: 'mixed',
          matcher: 'minimatch',
          ignorePattern: [],
          ignoreCase: true,
          specialCharacters: 'keep',
          customGroups: {},
          order: 'asc',
          groups: [],
        })
        validateGroupsConfiguration.validateGroupsConfiguration(
          options.groups,
          ['multiline', 'method', 'unknown'],
          Object.keys(options.customGroups),
        )
        let sourceCode = getSourceCode.getSourceCode(context)
        let partitionComment = options.partitionByComment
        if (
          !options.ignorePattern.some(pattern =>
            matches.matches(node.id.name, pattern, options.matcher),
          )
        ) {
          let formattedMembers = node.body.body.reduce(
            (accumulator, element) => {
              var _a, _b, _c, _d, _e
              if (element.type === 'TSCallSignatureDeclaration') {
                accumulator.push([])
                return accumulator
              }
              let lastElement =
                (_a = accumulator.at(-1)) == null ? void 0 : _a.at(-1)
              let name
              let { getGroup, defineGroup, setCustomGroups } =
                useGroups.useGroups(options)
              if (element.type === 'TSPropertySignature') {
                if (element.key.type === 'Identifier') {
                  ;({ name } = element.key)
                } else if (element.key.type === 'Literal') {
                  name = `${element.key.value}`
                } else {
                  let end =
                    ((_b = element.typeAnnotation) == null
                      ? void 0
                      : _b.range.at(0)) ??
                    element.range.at(1) - (element.optional ? '?'.length : 0)
                  name = sourceCode.text.slice(element.range.at(0), end)
                }
              } else if (element.type === 'TSIndexSignature') {
                let endIndex =
                  ((_c = element.typeAnnotation) == null
                    ? void 0
                    : _c.range.at(0)) ?? element.range.at(1)
                name = sourceCode.text.slice(element.range.at(0), endIndex)
              } else {
                let endIndex =
                  ((_d = element.returnType) == null
                    ? void 0
                    : _d.range.at(0)) ?? element.range.at(1)
                name = sourceCode.text.slice(element.range.at(0), endIndex)
              }
              setCustomGroups(options.customGroups, name)
              if (
                element.type === 'TSMethodSignature' ||
                (element.type === 'TSPropertySignature' &&
                  ((_e = element.typeAnnotation) == null
                    ? void 0
                    : _e.typeAnnotation.type) === 'TSFunctionType')
              ) {
                defineGroup('method')
              }
              if (element.loc.start.line !== element.loc.end.line) {
                defineGroup('multiline')
              }
              let elementSortingNode = {
                size: rangeToDiff.rangeToDiff(element.range),
                node: element,
                group: getGroup(),
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
                  lastElement &&
                  getLinesBetween.getLinesBetween(
                    sourceCode,
                    lastElement,
                    elementSortingNode,
                  ))
              ) {
                accumulator.push([])
              }
              accumulator.at(-1).push(elementSortingNode)
              return accumulator
            },
            [[]],
          )
          let { groupKind } = options
          for (let nodes of formattedMembers) {
            let sortedNodes
            if (groupKind !== 'mixed') {
              let optionalNodes = nodes.filter(member =>
                isMemberOptional.isMemberOptional(member.node),
              )
              let requiredNodes = nodes.filter(
                member => !isMemberOptional.isMemberOptional(member.node),
              )
              sortedNodes =
                groupKind === 'optional-first'
                  ? [
                      ...sortNodesByGroups.sortNodesByGroups(
                        optionalNodes,
                        options,
                      ),
                      ...sortNodesByGroups.sortNodesByGroups(
                        requiredNodes,
                        options,
                      ),
                    ]
                  : [
                      ...sortNodesByGroups.sortNodesByGroups(
                        requiredNodes,
                        options,
                      ),
                      ...sortNodesByGroups.sortNodesByGroups(
                        optionalNodes,
                        options,
                      ),
                    ]
            } else {
              sortedNodes = sortNodesByGroups.sortNodesByGroups(nodes, options)
            }
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
                      ? 'unexpectedInterfacePropertiesGroupOrder'
                      : 'unexpectedInterfacePropertiesOrder',
                  data: {
                    left: toSingleLine.toSingleLine(left.name),
                    leftGroup: left.group,
                    right: toSingleLine.toSingleLine(right.name),
                    rightGroup: right.group,
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
      }
    },
  }),
})
module.exports = sortInterfaces
