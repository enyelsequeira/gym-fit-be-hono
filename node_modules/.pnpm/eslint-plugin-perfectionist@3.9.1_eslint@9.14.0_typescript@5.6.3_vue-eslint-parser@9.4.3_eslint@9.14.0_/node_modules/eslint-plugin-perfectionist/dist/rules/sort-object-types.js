'use strict'
const validateGroupsConfiguration = require('../utils/validate-groups-configuration.js')
const isPartitionComment = require('../utils/is-partition-comment.js')
const sortNodesByGroups = require('../utils/sort-nodes-by-groups.js')
const getCommentsBefore = require('../utils/get-comments-before.js')
const createEslintRule = require('../utils/create-eslint-rule.js')
const getLinesBetween = require('../utils/get-lines-between.js')
const getGroupNumber = require('../utils/get-group-number.js')
const getSourceCode = require('../utils/get-source-code.js')
const toSingleLine = require('../utils/to-single-line.js')
const rangeToDiff = require('../utils/range-to-diff.js')
const getSettings = require('../utils/get-settings.js')
const makeFixes = require('../utils/make-fixes.js')
const useGroups = require('../utils/use-groups.js')
const complete = require('../utils/complete.js')
const pairwise = require('../utils/pairwise.js')
const sortObjectTypes = createEslintRule.createEslintRule({
  name: 'sort-object-types',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce sorted object types.',
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
              'Allows you to use comments to separate the type members into logical groups.',
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
            enum: ['mixed', 'required-first', 'optional-first'],
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
      unexpectedObjectTypesGroupOrder:
        'Expected "{{right}}" ({{rightGroup}}) to come before "{{left}}" ({{leftGroup}}).',
      unexpectedObjectTypesOrder:
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
      groupKind: 'mixed',
      groups: [],
      customGroups: {},
    },
  ],
  create: context => ({
    TSTypeLiteral: node => {
      if (node.members.length > 1) {
        let settings = getSettings.getSettings(context.settings)
        let options = complete.complete(context.options.at(0), settings, {
          partitionByComment: false,
          partitionByNewLine: false,
          type: 'alphabetical',
          groupKind: 'mixed',
          matcher: 'minimatch',
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
        let formattedMembers = node.members.reduce(
          (accumulator, member) => {
            var _a, _b, _c, _d, _e
            let name
            let raw = sourceCode.text.slice(
              member.range.at(0),
              member.range.at(1),
            )
            let lastSortingNode =
              (_a = accumulator.at(-1)) == null ? void 0 : _a.at(-1)
            let { getGroup, defineGroup, setCustomGroups } =
              useGroups.useGroups(options)
            let formatName = value => value.replace(/([,;])$/, '')
            if (member.type === 'TSPropertySignature') {
              if (member.key.type === 'Identifier') {
                ;({ name } = member.key)
              } else if (member.key.type === 'Literal') {
                name = `${member.key.value}`
              } else {
                name = sourceCode.text.slice(
                  member.range.at(0),
                  (_b = member.typeAnnotation) == null
                    ? void 0
                    : _b.range.at(0),
                )
              }
            } else if (member.type === 'TSIndexSignature') {
              let endIndex =
                ((_c = member.typeAnnotation) == null
                  ? void 0
                  : _c.range.at(0)) ?? member.range.at(1)
              name = formatName(
                sourceCode.text.slice(member.range.at(0), endIndex),
              )
            } else {
              name = formatName(
                sourceCode.text.slice(member.range.at(0), member.range.at(1)),
              )
            }
            setCustomGroups(options.customGroups, name)
            if (
              member.type === 'TSMethodSignature' ||
              (member.type === 'TSPropertySignature' &&
                ((_d = member.typeAnnotation) == null
                  ? void 0
                  : _d.typeAnnotation.type) === 'TSFunctionType')
            ) {
              defineGroup('method')
            }
            if (member.loc.start.line !== member.loc.end.line) {
              defineGroup('multiline')
            }
            let endsWithComma = raw.endsWith(';') || raw.endsWith(',')
            let endSize = endsWithComma ? 1 : 0
            let sortingNode = {
              size: rangeToDiff.rangeToDiff(member.range) - endSize,
              group: getGroup(),
              node: member,
              name,
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
            ;(_e = accumulator.at(-1)) == null ? void 0 : _e.push(sortingNode)
            return accumulator
          },
          [[]],
        )
        for (let nodes of formattedMembers) {
          let groupedByKind
          if (options.groupKind !== 'mixed') {
            groupedByKind = nodes.reduce(
              (accumulator, currentNode) => {
                let requiredIndex =
                  options.groupKind === 'required-first' ? 0 : 1
                let optionalIndex =
                  options.groupKind === 'required-first' ? 1 : 0
                if (
                  'optional' in currentNode.node &&
                  currentNode.node.optional
                ) {
                  accumulator[optionalIndex].push(currentNode)
                } else {
                  accumulator[requiredIndex].push(currentNode)
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
            sortedNodes.push(
              ...sortNodesByGroups.sortNodesByGroups(nodesByKind, options),
            )
          }
          pairwise.pairwise(nodes, (left, right) => {
            let indexOfLeft = sortedNodes.indexOf(left)
            let indexOfRight = sortedNodes.indexOf(right)
            if (indexOfLeft > indexOfRight) {
              let leftNum = getGroupNumber.getGroupNumber(options.groups, left)
              let rightNum = getGroupNumber.getGroupNumber(
                options.groups,
                right,
              )
              context.report({
                messageId:
                  leftNum !== rightNum
                    ? 'unexpectedObjectTypesGroupOrder'
                    : 'unexpectedObjectTypesOrder',
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
    },
  }),
})
module.exports = sortObjectTypes
