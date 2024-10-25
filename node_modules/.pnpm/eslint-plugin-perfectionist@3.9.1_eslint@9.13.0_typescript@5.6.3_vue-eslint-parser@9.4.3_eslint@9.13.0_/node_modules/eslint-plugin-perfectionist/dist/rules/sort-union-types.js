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
const useGroups = require('../utils/use-groups.js')
const makeFixes = require('../utils/make-fixes.js')
const complete = require('../utils/complete.js')
const pairwise = require('../utils/pairwise.js')
const sortUnionTypes = createEslintRule.createEslintRule({
  name: 'sort-union-types',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce sorted union types.',
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
          partitionByComment: {
            description:
              'Allows you to use comments to separate the union types into logical groups.',
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
      unexpectedUnionTypesGroupOrder:
        'Expected "{{right}}" ({{rightGroup}}) to come before "{{left}}" ({{leftGroup}}).',
      unexpectedUnionTypesOrder:
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
      groups: [],
    },
  ],
  create: context => ({
    TSUnionType: node => {
      let settings = getSettings.getSettings(context.settings)
      let options = complete.complete(context.options.at(0), settings, {
        type: 'alphabetical',
        ignoreCase: true,
        specialCharacters: 'keep',
        order: 'asc',
        groups: [],
        matcher: 'minimatch',
        partitionByNewLine: false,
        partitionByComment: false,
      })
      validateGroupsConfiguration.validateGroupsConfiguration(
        options.groups,
        [
          'intersection',
          'conditional',
          'function',
          'operator',
          'keyword',
          'literal',
          'nullish',
          'unknown',
          'import',
          'object',
          'named',
          'tuple',
          'union',
        ],
        [],
      )
      let sourceCode = getSourceCode.getSourceCode(context)
      let partitionComment = options.partitionByComment
      let formattedMembers = node.types.reduce(
        (accumulator, type) => {
          var _a, _b
          let { getGroup, defineGroup } = useGroups.useGroups(options)
          switch (type.type) {
            case 'TSConditionalType':
              defineGroup('conditional')
              break
            case 'TSConstructorType':
            case 'TSFunctionType':
              defineGroup('function')
              break
            case 'TSImportType':
              defineGroup('import')
              break
            case 'TSIntersectionType':
              defineGroup('intersection')
              break
            case 'TSAnyKeyword':
            case 'TSBigIntKeyword':
            case 'TSBooleanKeyword':
            case 'TSNeverKeyword':
            case 'TSNumberKeyword':
            case 'TSObjectKeyword':
            case 'TSStringKeyword':
            case 'TSSymbolKeyword':
            case 'TSThisType':
            case 'TSUnknownKeyword':
            case 'TSIntrinsicKeyword':
              defineGroup('keyword')
              break
            case 'TSLiteralType':
            case 'TSTemplateLiteralType':
              defineGroup('literal')
              break
            case 'TSArrayType':
            case 'TSIndexedAccessType':
            case 'TSInferType':
            case 'TSTypeReference':
            case 'TSQualifiedName':
              defineGroup('named')
              break
            case 'TSMappedType':
            case 'TSTypeLiteral':
              defineGroup('object')
              break
            case 'TSTypeQuery':
            case 'TSTypeOperator':
              defineGroup('operator')
              break
            case 'TSTupleType':
              defineGroup('tuple')
              break
            case 'TSUnionType':
              defineGroup('union')
              break
            case 'TSNullKeyword':
            case 'TSUndefinedKeyword':
            case 'TSVoidKeyword':
              defineGroup('nullish')
              break
          }
          let lastSortingNode =
            (_a = accumulator.at(-1)) == null ? void 0 : _a.at(-1)
          let sortingNode = {
            name: sourceCode.text.slice(...type.range),
            size: rangeToDiff.rangeToDiff(type.range),
            group: getGroup(),
            node: type,
          }
          if (
            (partitionComment &&
              isPartitionComment.hasPartitionComment(
                partitionComment,
                getCommentsBefore.getCommentsBefore(type, sourceCode),
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
      for (let nodes of formattedMembers) {
        let sortedNodes = sortNodesByGroups.sortNodesByGroups(nodes, options)
        pairwise.pairwise(nodes, (left, right) => {
          let indexOfLeft = sortedNodes.indexOf(left)
          let indexOfRight = sortedNodes.indexOf(right)
          if (indexOfLeft > indexOfRight) {
            let leftNum = getGroupNumber.getGroupNumber(options.groups, left)
            let rightNum = getGroupNumber.getGroupNumber(options.groups, right)
            context.report({
              messageId:
                leftNum !== rightNum
                  ? 'unexpectedUnionTypesGroupOrder'
                  : 'unexpectedUnionTypesOrder',
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
    },
  }),
})
module.exports = sortUnionTypes
