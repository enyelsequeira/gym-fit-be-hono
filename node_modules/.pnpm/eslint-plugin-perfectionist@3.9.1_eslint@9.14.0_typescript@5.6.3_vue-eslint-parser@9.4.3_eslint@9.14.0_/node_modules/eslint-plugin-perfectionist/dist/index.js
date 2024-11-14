'use strict'
const sortVariableDeclarations = require('./rules/sort-variable-declarations.js')
const sortIntersectionTypes = require('./rules/sort-intersection-types.js')
const sortSvelteAttributes = require('./rules/sort-svelte-attributes.js')
const sortAstroAttributes = require('./rules/sort-astro-attributes.js')
const sortArrayIncludes = require('./rules/sort-array-includes.js')
const sortVueAttributes = require('./rules/sort-vue-attributes.js')
const sortNamedImports = require('./rules/sort-named-imports.js')
const sortNamedExports = require('./rules/sort-named-exports.js')
const sortObjectTypes = require('./rules/sort-object-types.js')
const sortSwitchCase = require('./rules/sort-switch-case.js')
const sortUnionTypes = require('./rules/sort-union-types.js')
const sortInterfaces = require('./rules/sort-interfaces.js')
const sortJsxProps = require('./rules/sort-jsx-props.js')
const sortClasses = require('./rules/sort-classes.js')
const sortImports = require('./rules/sort-imports.js')
const sortExports = require('./rules/sort-exports.js')
const sortObjects = require('./rules/sort-objects.js')
const sortEnums = require('./rules/sort-enums.js')
const sortMaps = require('./rules/sort-maps.js')
const sortSets = require('./rules/sort-sets.js')
let name = 'perfectionist'
let plugin = {
  rules: {
    'sort-variable-declarations': sortVariableDeclarations,
    'sort-intersection-types': sortIntersectionTypes,
    'sort-svelte-attributes': sortSvelteAttributes,
    'sort-astro-attributes': sortAstroAttributes,
    'sort-vue-attributes': sortVueAttributes,
    'sort-array-includes': sortArrayIncludes.default,
    'sort-named-imports': sortNamedImports,
    'sort-named-exports': sortNamedExports,
    'sort-object-types': sortObjectTypes,
    'sort-union-types': sortUnionTypes,
    'sort-switch-case': sortSwitchCase,
    'sort-interfaces': sortInterfaces,
    'sort-jsx-props': sortJsxProps,
    'sort-classes': sortClasses,
    'sort-imports': sortImports,
    'sort-exports': sortExports,
    'sort-objects': sortObjects,
    'sort-enums': sortEnums,
    'sort-sets': sortSets,
    'sort-maps': sortMaps,
  },
  name,
}
let getRules = options =>
  Object.fromEntries(
    Object.entries(plugin.rules).reduce(
      (accumulator, [ruleName, ruleValue]) =>
        ruleValue.meta.deprecated
          ? accumulator
          : [...accumulator, [`${name}/${ruleName}`, ['error', options]]],
      [],
    ),
  )
let createConfig = options => ({
  plugins: {
    [name]: plugin,
  },
  rules: getRules(options),
})
let createLegacyConfig = options => ({
  rules: getRules(options),
  plugins: [name],
})
const index = {
  ...plugin,
  configs: {
    'recommended-alphabetical-legacy': createLegacyConfig({
      type: 'alphabetical',
      order: 'asc',
    }),
    'recommended-line-length-legacy': createLegacyConfig({
      type: 'line-length',
      order: 'desc',
    }),
    'recommended-natural-legacy': createLegacyConfig({
      type: 'natural',
      order: 'asc',
    }),
    'recommended-alphabetical': createConfig({
      type: 'alphabetical',
      order: 'asc',
    }),
    'recommended-line-length': createConfig({
      type: 'line-length',
      order: 'desc',
    }),
    'recommended-natural': createConfig({
      type: 'natural',
      order: 'asc',
    }),
  },
}
module.exports = index
