import sortVariableDeclarations from './rules/sort-variable-declarations.mjs'
import sortIntersectionTypes from './rules/sort-intersection-types.mjs'
import sortSvelteAttributes from './rules/sort-svelte-attributes.mjs'
import sortAstroAttributes from './rules/sort-astro-attributes.mjs'
import sortArrayIncludes from './rules/sort-array-includes.mjs'
import sortVueAttributes from './rules/sort-vue-attributes.mjs'
import sortNamedImports from './rules/sort-named-imports.mjs'
import sortNamedExports from './rules/sort-named-exports.mjs'
import sortObjectTypes from './rules/sort-object-types.mjs'
import sortSwitchCase from './rules/sort-switch-case.mjs'
import sortUnionTypes from './rules/sort-union-types.mjs'
import sortInterfaces from './rules/sort-interfaces.mjs'
import sortJsxProps from './rules/sort-jsx-props.mjs'
import sortClasses from './rules/sort-classes.mjs'
import sortImports from './rules/sort-imports.mjs'
import sortExports from './rules/sort-exports.mjs'
import sortObjects from './rules/sort-objects.mjs'
import sortEnums from './rules/sort-enums.mjs'
import sortMaps from './rules/sort-maps.mjs'
import sortSets from './rules/sort-sets.mjs'
let name = 'perfectionist'
let plugin = {
  rules: {
    'sort-variable-declarations': sortVariableDeclarations,
    'sort-intersection-types': sortIntersectionTypes,
    'sort-svelte-attributes': sortSvelteAttributes,
    'sort-astro-attributes': sortAstroAttributes,
    'sort-vue-attributes': sortVueAttributes,
    'sort-array-includes': sortArrayIncludes,
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
export { index as default }
