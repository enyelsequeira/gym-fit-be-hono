const getOptionsWithCleanGroups = options => ({
  ...options,
  groups: options.groups
    .filter(group => group.length > 0)
    .map(group =>
      typeof group === 'string' ? group : getCleanedNestedGroups(group),
    ),
})
const getCleanedNestedGroups = nestedGroup =>
  nestedGroup.length === 1 ? nestedGroup[0] : nestedGroup
export { getOptionsWithCleanGroups }
