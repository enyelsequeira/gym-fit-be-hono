import { createEslintRule } from '../utils/create-eslint-rule.mjs'
import { jsonSchema, sortArray } from './sort-array-includes.mjs'
const sortSets = createEslintRule({
  name: 'sort-sets',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce sorted sets.',
    },
    fixable: 'code',
    schema: [jsonSchema],
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
        sortArray(context, 'unexpectedSetsOrder', elements)
      }
    },
  }),
})
export { sortSets as default }
