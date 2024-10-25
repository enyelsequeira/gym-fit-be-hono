import { matches } from './matches.mjs'
let useGroups = ({ matcher, groups }) => {
  let group
  let groupsSet = new Set(groups.flat())
  let defineGroup = (value, override = false) => {
    if ((!group || override) && groupsSet.has(value)) {
      group = value
    }
  }
  let setCustomGroups = (customGroups, name, params = {}) => {
    if (customGroups) {
      for (let [key, pattern] of Object.entries(customGroups)) {
        if (
          Array.isArray(pattern) &&
          pattern.some(patternValue => matches(name, patternValue, matcher))
        ) {
          defineGroup(key, params.override)
        }
        if (typeof pattern === 'string' && matches(name, pattern, matcher)) {
          defineGroup(key, params.override)
        }
      }
    }
  }
  return {
    getGroup: () => group ?? 'unknown',
    setCustomGroups,
    defineGroup,
  }
}
export { useGroups }
