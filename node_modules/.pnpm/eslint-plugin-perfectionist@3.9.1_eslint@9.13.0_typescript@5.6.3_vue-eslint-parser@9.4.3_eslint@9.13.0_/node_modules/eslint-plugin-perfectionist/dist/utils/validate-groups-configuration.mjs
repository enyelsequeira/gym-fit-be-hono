let validateGroupsConfiguration = (
  groups,
  allowedPredefinedGroups,
  allowedCustomGroups,
) => {
  let allowedGroupsSet = /* @__PURE__ */ new Set([
    ...allowedPredefinedGroups,
    ...allowedCustomGroups,
  ])
  let invalidGroups = groups
    .flat()
    .filter(group => !allowedGroupsSet.has(group))
  if (invalidGroups.length) {
    throw new Error('Invalid group(s): ' + invalidGroups.join(', '))
  }
  validateNoDuplicatedGroups(groups)
}
let validateNoDuplicatedGroups = groups => {
  let flattenGroups = groups.flat()
  let duplicatedGroups = flattenGroups.filter(
    (group, index) => flattenGroups.indexOf(group) !== index,
  )
  if (duplicatedGroups.length) {
    throw new Error('Duplicated group(s): ' + duplicatedGroups.join(', '))
  }
}
export { validateGroupsConfiguration, validateNoDuplicatedGroups }
