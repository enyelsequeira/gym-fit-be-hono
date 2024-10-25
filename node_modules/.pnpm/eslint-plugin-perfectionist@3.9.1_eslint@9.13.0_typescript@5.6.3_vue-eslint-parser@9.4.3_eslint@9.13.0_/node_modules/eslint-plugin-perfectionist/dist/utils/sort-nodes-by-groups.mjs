import { getGroupNumber } from './get-group-number.mjs'
import { sortNodes } from './sort-nodes.mjs'
let sortNodesByGroups = (nodes, options, extraOptions) => {
  var _a
  let nodesByNonIgnoredGroupNumber = {}
  let ignoredNodeIndices = []
  for (let [index, sortingNode] of nodes.entries()) {
    if (
      (_a = extraOptions == null ? void 0 : extraOptions.isNodeIgnored) == null
        ? void 0
        : _a.call(extraOptions, sortingNode)
    ) {
      ignoredNodeIndices.push(index)
      continue
    }
    let groupNum = getGroupNumber(options.groups, sortingNode)
    nodesByNonIgnoredGroupNumber[groupNum] =
      nodesByNonIgnoredGroupNumber[groupNum] ?? []
    nodesByNonIgnoredGroupNumber[groupNum].push(sortingNode)
  }
  let sortedNodes = []
  for (let groupNumber of Object.keys(nodesByNonIgnoredGroupNumber).sort(
    (a, b) => Number(a) - Number(b),
  )) {
    let compareOptions = (
      extraOptions == null ? void 0 : extraOptions.getGroupCompareOptions
    )
      ? extraOptions.getGroupCompareOptions(Number(groupNumber))
      : options
    if (!compareOptions) {
      sortedNodes.push(...nodesByNonIgnoredGroupNumber[Number(groupNumber)])
      continue
    }
    sortedNodes.push(
      ...sortNodes(
        nodesByNonIgnoredGroupNumber[Number(groupNumber)],
        compareOptions,
      ),
    )
  }
  for (let ignoredIndex of ignoredNodeIndices) {
    sortedNodes.splice(ignoredIndex, 0, nodes[ignoredIndex])
  }
  return sortedNodes
}
export { sortNodesByGroups }
