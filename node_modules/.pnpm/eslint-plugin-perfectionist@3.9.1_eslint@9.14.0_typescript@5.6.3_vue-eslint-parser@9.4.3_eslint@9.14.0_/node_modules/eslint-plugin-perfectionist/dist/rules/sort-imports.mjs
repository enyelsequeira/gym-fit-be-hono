import { builtinModules } from 'node:module'
import { validateGroupsConfiguration } from '../utils/validate-groups-configuration.mjs'
import { getOptionsWithCleanGroups } from '../utils/get-options-with-clean-groups.mjs'
import { sortNodesByGroups } from '../utils/sort-nodes-by-groups.mjs'
import { getCommentsBefore } from '../utils/get-comments-before.mjs'
import { createEslintRule } from '../utils/create-eslint-rule.mjs'
import { getLinesBetween } from '../utils/get-lines-between.mjs'
import { getGroupNumber } from '../utils/get-group-number.mjs'
import { getSourceCode } from '../utils/get-source-code.mjs'
import { getNodeRange } from '../utils/get-node-range.mjs'
import { rangeToDiff } from '../utils/range-to-diff.mjs'
import { getSettings } from '../utils/get-settings.mjs'
import { useGroups } from '../utils/use-groups.mjs'
import { makeFixes } from '../utils/make-fixes.mjs'
import { complete } from '../utils/complete.mjs'
import { pairwise } from '../utils/pairwise.mjs'
import { matches } from '../utils/matches.mjs'
const sortImports = createEslintRule({
  name: 'sort-imports',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce sorted imports.',
    },
    fixable: 'code',
    schema: [
      {
        id: 'sort-imports',
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
          internalPattern: {
            description: 'Specifies the pattern for internal modules.',
            items: {
              type: 'string',
            },
            type: 'array',
          },
          sortSideEffects: {
            description:
              'Controls whether side-effect imports should be sorted.',
            type: 'boolean',
          },
          newlinesBetween: {
            description:
              'Specifies how new lines should be handled between import groups.',
            enum: ['ignore', 'always', 'never'],
            type: 'string',
          },
          maxLineLength: {
            description: 'Specifies the maximum line length.',
            type: 'integer',
            minimum: 0,
            exclusiveMinimum: true,
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
            properties: {
              type: {
                type: 'object',
              },
              value: {
                type: 'object',
              },
            },
            additionalProperties: false,
          },
          environment: {
            description: 'Specifies the environment.',
            enum: ['node', 'bun'],
            type: 'string',
          },
        },
        allOf: [
          {
            $ref: '#/definitions/max-line-length-requires-line-length-type',
          },
        ],
        additionalProperties: false,
        dependencies: {
          maxLineLength: ['type'],
        },
        definitions: {
          'is-line-length': {
            properties: {
              type: { enum: ['line-length'], type: 'string' },
            },
            required: ['type'],
            type: 'object',
          },
          'max-line-length-requires-line-length-type': {
            anyOf: [
              {
                not: {
                  required: ['maxLineLength'],
                  type: 'object',
                },
                type: 'object',
              },
              {
                $ref: '#/definitions/is-line-length',
              },
            ],
          },
        },
      },
    ],
    messages: {
      unexpectedImportsGroupOrder:
        'Expected "{{right}}" ({{rightGroup}}) to come before "{{left}}" ({{leftGroup}}).',
      unexpectedImportsOrder: 'Expected "{{right}}" to come before "{{left}}".',
      missedSpacingBetweenImports:
        'Missed spacing between "{{left}}" and "{{right}}" imports.',
      extraSpacingBetweenImports:
        'Extra spacing between "{{left}}" and "{{right}}" imports.',
    },
  },
  defaultOptions: [
    {
      type: 'alphabetical',
      order: 'asc',
      ignoreCase: true,
      specialCharacters: 'keep',
      internalPattern: ['~/**'],
      sortSideEffects: false,
      newlinesBetween: 'always',
      maxLineLength: void 0,
      matcher: 'minimatch',
      groups: [
        'type',
        ['builtin', 'external'],
        'internal-type',
        'internal',
        ['parent-type', 'sibling-type', 'index-type'],
        ['parent', 'sibling', 'index'],
        'object',
        'unknown',
      ],
      customGroups: { type: {}, value: {} },
      environment: 'node',
    },
  ],
  create: context => {
    let settings = getSettings(context.settings)
    let userOptions = context.options.at(0)
    let options = getOptionsWithCleanGroups(
      complete(userOptions, settings, {
        groups: [
          'type',
          ['builtin', 'external'],
          'internal-type',
          'internal',
          ['parent-type', 'sibling-type', 'index-type'],
          ['parent', 'sibling', 'index'],
          'object',
          'unknown',
        ],
        matcher: 'minimatch',
        customGroups: { type: {}, value: {} },
        internalPattern:
          (userOptions == null ? void 0 : userOptions.matcher) === 'regex'
            ? ['^~/.*']
            : ['~/**'],
        newlinesBetween: 'always',
        sortSideEffects: false,
        type: 'alphabetical',
        environment: 'node',
        ignoreCase: true,
        specialCharacters: 'keep',
        order: 'asc',
      }),
    )
    validateGroupsConfiguration(
      options.groups,
      [
        'side-effect-style',
        'external-type',
        'internal-type',
        'builtin-type',
        'sibling-type',
        'parent-type',
        'side-effect',
        'index-type',
        'internal',
        'external',
        'sibling',
        'unknown',
        'builtin',
        'parent',
        'object',
        'index',
        'style',
        'type',
      ],
      [
        ...Object.keys(options.customGroups.type ?? {}),
        ...Object.keys(options.customGroups.value ?? {}),
      ],
    )
    let isSideEffectOnlyGroup = group => {
      if (!group) {
        return false
      }
      if (typeof group === 'string') {
        return group === 'side-effect' || group === 'side-effect-style'
      }
      return group.every(isSideEffectOnlyGroup)
    }
    if (!options.sortSideEffects) {
      let hasInvalidGroup = options.groups
        .filter(group => Array.isArray(group))
        .some(
          nestedGroup =>
            !isSideEffectOnlyGroup(nestedGroup) &&
            nestedGroup.some(
              subGroup =>
                subGroup === 'side-effect' || subGroup === 'side-effect-style',
            ),
        )
      if (hasInvalidGroup) {
        throw new Error(
          "Side effect groups cannot be nested with non side effect groups when 'sortSideEffects' is 'false'.",
        )
      }
    }
    let sourceCode = getSourceCode(context)
    let nodes = []
    let isSideEffectImport = node =>
      node.type === 'ImportDeclaration' &&
      node.specifiers.length ===
        0 /* Avoid matching on named imports without specifiers */ &&
      !/}\s*from\s+/.test(sourceCode.getText(node))
    let isStyle = value =>
      ['.less', '.scss', '.sass', '.styl', '.pcss', '.css', '.sss'].some(
        extension => value.endsWith(extension),
      )
    let hasMultipleImportDeclarations = node => node.specifiers.length > 1
    let flatGroups = options.groups.flat()
    let shouldRegroupSideEffectNodes = flatGroups.includes('side-effect')
    let shouldRegroupSideEffectStyleNodes =
      flatGroups.includes('side-effect-style')
    let registerNode = node => {
      let name
      if (node.type === 'ImportDeclaration') {
        name = node.source.value
      } else if (node.type === 'TSImportEqualsDeclaration') {
        if (node.moduleReference.type === 'TSExternalModuleReference') {
          name = `${node.moduleReference.expression.value}`
        } else {
          name = sourceCode.text.slice(...node.moduleReference.range)
        }
      } else {
        let decl = node.declarations[0].init
        let { value } = decl.arguments[0]
        name = value.toString()
      }
      let isIndex = value =>
        [
          './index.d.js',
          './index.d.ts',
          './index.js',
          './index.ts',
          './index',
          './',
          '.',
        ].includes(value)
      let isParent = value => value.startsWith('..')
      let isSibling = value => value.startsWith('./')
      let { getGroup, defineGroup, setCustomGroups } = useGroups(options)
      let isInternal = value =>
        options.internalPattern.length &&
        options.internalPattern.some(pattern =>
          matches(value, pattern, options.matcher),
        )
      let isCoreModule = value => {
        let bunModules = [
          'bun',
          'bun:ffi',
          'bun:jsc',
          'bun:sqlite',
          'bun:test',
          'bun:wrap',
          'detect-libc',
          'undici',
          'ws',
        ]
        let builtinPrefixOnlyModules = ['sea', 'sqlite', 'test']
        return (
          builtinModules.includes(
            value.startsWith('node:') ? value.split('node:')[1] : value,
          ) ||
          builtinPrefixOnlyModules.some(module => `node:${module}` === value) ||
          (options.environment === 'bun' ? bunModules.includes(value) : false)
        )
      }
      let isExternal = value =>
        !(value.startsWith('.') || value.startsWith('/'))
      if (node.type !== 'VariableDeclaration' && node.importKind === 'type') {
        if (node.type === 'ImportDeclaration') {
          setCustomGroups(options.customGroups.type, node.source.value)
          if (isIndex(node.source.value)) {
            defineGroup('index-type')
          }
          if (isSibling(node.source.value)) {
            defineGroup('sibling-type')
          }
          if (isParent(node.source.value)) {
            defineGroup('parent-type')
          }
          if (isInternal(node.source.value)) {
            defineGroup('internal-type')
          }
          if (isCoreModule(node.source.value)) {
            defineGroup('builtin-type')
          }
          if (isExternal(node.source.value)) {
            defineGroup('external-type')
          }
        }
        defineGroup('type')
      }
      let isSideEffect = isSideEffectImport(node)
      let isStyleSideEffect = false
      if (
        node.type === 'ImportDeclaration' ||
        node.type === 'VariableDeclaration'
      ) {
        let value
        if (node.type === 'ImportDeclaration') {
          ;({ value } = node.source)
        } else {
          let decl = node.declarations[0].init
          let declValue = decl.arguments[0].value
          value = declValue.toString()
        }
        let isStyleValue = isStyle(value)
        isStyleSideEffect = isSideEffect && isStyleValue
        setCustomGroups(options.customGroups.value, value)
        if (isStyleSideEffect) {
          defineGroup('side-effect-style')
        }
        if (isSideEffect) {
          defineGroup('side-effect')
        }
        if (isStyleValue) {
          defineGroup('style')
        }
        if (isIndex(value)) {
          defineGroup('index')
        }
        if (isSibling(value)) {
          defineGroup('sibling')
        }
        if (isParent(value)) {
          defineGroup('parent')
        }
        if (isInternal(value)) {
          defineGroup('internal')
        }
        if (isCoreModule(value)) {
          defineGroup('builtin')
        }
        if (isExternal(value)) {
          defineGroup('external')
        }
      }
      nodes.push({
        size: rangeToDiff(node.range),
        group: getGroup(),
        node,
        isIgnored:
          !options.sortSideEffects &&
          isSideEffect &&
          !shouldRegroupSideEffectNodes &&
          (!isStyleSideEffect || !shouldRegroupSideEffectStyleNodes),
        name,
        ...(options.type === 'line-length' &&
          options.maxLineLength && {
            hasMultipleImportDeclarations: hasMultipleImportDeclarations(node),
          }),
      })
    }
    return {
      TSImportEqualsDeclaration: registerNode,
      ImportDeclaration: registerNode,
      VariableDeclaration: node => {
        var _a
        if (
          node.declarations[0].init &&
          node.declarations[0].init.type === 'CallExpression' &&
          node.declarations[0].init.callee.type === 'Identifier' &&
          node.declarations[0].init.callee.name === 'require' &&
          ((_a = node.declarations[0].init.arguments[0]) == null
            ? void 0
            : _a.type) === 'Literal'
        ) {
          registerNode(node)
        }
      },
      'Program:exit': () => {
        var _a
        let hasContentBetweenNodes = (left, right) =>
          getCommentsBefore(right.node, sourceCode).length > 0 ||
          !!sourceCode.getTokensBetween(left.node, right.node, {
            includeComments: false,
          }).length
        let splitNodes = [[]]
        for (let node of nodes) {
          let lastNode = (_a = splitNodes.at(-1)) == null ? void 0 : _a.at(-1)
          if (lastNode && hasContentBetweenNodes(lastNode, node)) {
            splitNodes.push([node])
          } else {
            splitNodes.at(-1).push(node)
          }
        }
        for (let nodeList of splitNodes) {
          let sortedNodes = sortNodesByGroups(nodeList, options, {
            isNodeIgnored: node => node.isIgnored,
            getGroupCompareOptions: groupNumber => {
              if (options.sortSideEffects) {
                return options
              }
              let group = options.groups[groupNumber]
              return isSideEffectOnlyGroup(group) ? null : options
            },
          })
          pairwise(nodeList, (left, right) => {
            let leftNum = getGroupNumber(options.groups, left)
            let rightNum = getGroupNumber(options.groups, right)
            let indexOfLeft = sortedNodes.indexOf(left)
            let indexOfRight = sortedNodes.indexOf(right)
            let messageIds = []
            if (indexOfLeft > indexOfRight) {
              messageIds.push(
                leftNum !== rightNum
                  ? 'unexpectedImportsGroupOrder'
                  : 'unexpectedImportsOrder',
              )
            }
            let numberOfEmptyLinesBetween = getLinesBetween(
              sourceCode,
              left,
              right,
            )
            if (
              options.newlinesBetween === 'never' &&
              numberOfEmptyLinesBetween > 0
            ) {
              messageIds.push('extraSpacingBetweenImports')
            }
            if (options.newlinesBetween === 'always') {
              if (leftNum < rightNum && numberOfEmptyLinesBetween === 0) {
                messageIds.push('missedSpacingBetweenImports')
              } else if (
                numberOfEmptyLinesBetween > 1 ||
                (leftNum === rightNum && numberOfEmptyLinesBetween > 0)
              ) {
                messageIds.push('extraSpacingBetweenImports')
              }
            }
            for (let messageId of messageIds) {
              context.report({
                messageId,
                data: {
                  left: left.name,
                  leftGroup: left.group,
                  right: right.name,
                  rightGroup: right.group,
                },
                node: right.node,
                fix: fixer => {
                  let newlinesFixes = []
                  for (let max = sortedNodes.length, i = 0; i < max; i++) {
                    let node = sortedNodes.at(i)
                    let nextNode = sortedNodes.at(i + 1)
                    if (options.newlinesBetween === 'ignore' || !nextNode) {
                      continue
                    }
                    let nodeGroupNumber = getGroupNumber(options.groups, node)
                    let nextNodeGroupNumber = getGroupNumber(
                      options.groups,
                      nextNode,
                    )
                    let currentNodeRange = getNodeRange(
                      nodeList.at(i).node,
                      sourceCode,
                      options,
                    )
                    let nextNodeRange =
                      getNodeRange(
                        nodeList.at(i + 1).node,
                        sourceCode,
                        options,
                      ).at(0) - 1
                    let linesBetweenImports = getLinesBetween(
                      sourceCode,
                      nodeList.at(i),
                      nodeList.at(i + 1),
                    )
                    if (
                      (options.newlinesBetween === 'always' &&
                        nodeGroupNumber === nextNodeGroupNumber &&
                        linesBetweenImports !== 0) ||
                      (options.newlinesBetween === 'never' &&
                        linesBetweenImports > 0)
                    ) {
                      newlinesFixes.push(
                        fixer.removeRange([
                          currentNodeRange.at(1),
                          nextNodeRange,
                        ]),
                      )
                    }
                    if (
                      options.newlinesBetween === 'always' &&
                      nodeGroupNumber !== nextNodeGroupNumber
                    ) {
                      if (linesBetweenImports > 1) {
                        newlinesFixes.push(
                          fixer.replaceTextRange(
                            [currentNodeRange.at(1), nextNodeRange],
                            '\n',
                          ),
                        )
                      } else if (linesBetweenImports === 0) {
                        newlinesFixes.push(
                          fixer.insertTextAfterRange(currentNodeRange, '\n'),
                        )
                      }
                    }
                  }
                  return [
                    ...makeFixes(fixer, nodeList, sortedNodes, sourceCode),
                    ...newlinesFixes,
                  ]
                },
              })
            }
          })
        }
      },
    }
  },
})
export { sortImports as default }
