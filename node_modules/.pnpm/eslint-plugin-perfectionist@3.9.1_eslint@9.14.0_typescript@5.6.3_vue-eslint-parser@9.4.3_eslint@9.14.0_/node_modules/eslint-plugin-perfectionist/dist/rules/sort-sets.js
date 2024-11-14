'use strict'
const createEslintRule = require('../utils/create-eslint-rule.js')
const sortArrayIncludes = require('./sort-array-includes.js')
const sortSets = createEslintRule.createEslintRule({
  name: 'sort-sets',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce sorted sets.',
    },
    fixable: 'code',
    schema: [sortArrayIncludes.jsonSchema],
    messages: {
      unexpectedSetsOrder: 'Expected "{{right}}" to come before "{{left}}".',
    },
  },
  defaultOptions: [
    {
      type: 'alphabetical',
      order: 'asc',
      ignoreCase: true,
      specialCharacters: 'keep',
      matcher: 'minimatch',
      groupKind: 'literals-first',
    },
  ],
  create: context => ({
    NewExpression: node => {
      var _a, _b
      if (
        node.callee.type === 'Identifier' &&
        node.callee.name === 'Set' &&
        node.arguments.length &&
        (((_a = node.arguments[0]) == null ? void 0 : _a.type) ===
          'ArrayExpression' ||
          (((_b = node.arguments[0]) == null ? void 0 : _b.type) ===
            'NewExpression' &&
            'name' in node.arguments[0].callee &&
            node.arguments[0].callee.name === 'Array'))
      ) {
        let elements =
          node.arguments[0].type === 'ArrayExpression'
            ? node.arguments[0].elements
            : node.arguments[0].arguments
        sortArrayIncludes.sortArray(context, 'unexpectedSetsOrder', elements)
      }
    },
  }),
})
module.exports = sortSets
