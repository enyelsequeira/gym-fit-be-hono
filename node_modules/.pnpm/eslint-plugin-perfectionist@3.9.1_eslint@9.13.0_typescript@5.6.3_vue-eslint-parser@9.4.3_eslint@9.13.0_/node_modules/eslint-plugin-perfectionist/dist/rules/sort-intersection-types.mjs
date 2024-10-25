import { validateGroupsConfiguration } from '../utils/validate-groups-configuration.mjs'
import { hasPartitionComment } from '../utils/is-partition-comment.mjs'
import { sortNodesByGroups } from '../utils/sort-nodes-by-groups.mjs'
import { getCommentsBefore } from '../utils/get-comments-before.mjs'
import { createEslintRule } from '../utils/create-eslint-rule.mjs'
import { getLinesBetween } from '../utils/get-lines-between.mjs'
import { getGroupNumber } from '../utils/get-group-number.mjs'
import { getSourceCode } from '../utils/get-source-code.mjs'
import { toSingleLine } from '../utils/to-single-line.mjs'
import { rangeToDiff } from '../utils/range-to-diff.mjs'
import { getSettings } from '../utils/get-settings.mjs'
import { useGroups } from '../utils/use-groups.mjs'
import { makeFixes } from '../utils/make-fixes.mjs'
import { complete } from '../utils/complete.mjs'
import { pairwise } from '../utils/pairwise.mjs'
const sortIntersectionTypes = createEslintRule({
  name: 'sort-intersection-types',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce sorted intersection types.',
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
              'Allows you to use comments to separate the intersection types members into logical groups.',
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
      unexpectedIntersectionTypesGroupOrder:
        'Expected "{{right}}" ({{rightGroup}}) to come before "{{left}}" ({{leftGroup}}).',
      unexpectedIntersectionTypesOrder:
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
    TSIntersectionType: node => {
      let settings = getSettings(context.settings)
      let options = complete(context.options.at(0), settings, {
        type: 'alphabetical',
        ignoreCase: true,
        specialCharacters: 'keep',
        order: 'asc',
        matcher: 'minimatch',
        partitionByComment: false,
        partitionByNewLine: false,
        groups: [],
      })
      validateGroupsConfiguration(
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
      let sourceCode = getSourceCode(context)
      let partitionComment = options.partitionByComment
      let formattedMembers = node.types.reduce(
        (accumulator, type) => {
          var _a, _b
          let { getGroup, defineGroup } = useGroups(options)
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
            size: rangeToDiff(type.range),
            group: getGroup(),
            node: type,
          }
          if (
            (partitionComment &&
              hasPartitionComment(
                partitionComment,
                getCommentsBefore(type, sourceCode),
                options.matcher,
              )) ||
            (options.partitionByNewLine &&
              lastSortingNode &&
              getLinesBetween(sourceCode, lastSortingNode, sortingNode))
          ) {
            accumulator.push([])
          }
          ;(_b = accumulator.at(-1)) == null ? void 0 : _b.push(sortingNode)
          return accumulator
        },
        [[]],
      )
      for (let nodes of formattedMembers) {
        let sortedNodes = sortNodesByGroups(nodes, options)
        pairwise(nodes, (left, right) => {
          let indexOfLeft = sortedNodes.indexOf(left)
          let indexOfRight = sortedNodes.indexOf(right)
          if (indexOfLeft > indexOfRight) {
            let leftNum = getGroupNumber(options.groups, left)
            let rightNum = getGroupNumber(options.groups, right)
            context.report({
              messageId:
                leftNum !== rightNum
                  ? 'unexpectedIntersectionTypesGroupOrder'
                  : 'unexpectedIntersectionTypesOrder',
              data: {
                left: toSingleLine(left.name),
                leftGroup: left.group,
                right: toSingleLine(right.name),
                rightGroup: right.group,
              },
              node: right.node,
              fix: fixer =>
                makeFixes(fixer, nodes, sortedNodes, sourceCode, options),
            })
          }
        })
      }
    },
  }),
})
export { sortIntersectionTypes as default }
