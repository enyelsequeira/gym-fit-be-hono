let sortNodesByDependencies = nodes => {
  let result = []
  let visitedNodes = /* @__PURE__ */ new Set()
  let inProcessNodes = /* @__PURE__ */ new Set()
  let visitNode = node => {
    if (visitedNodes.has(node)) {
      return
    }
    if (inProcessNodes.has(node)) {
      return
    }
    inProcessNodes.add(node)
    let dependentNodes = nodes.filter(n =>
      node.dependencies.includes(n.dependencyName ?? n.name),
    )
    for (let dependentNode of dependentNodes) {
      visitNode(dependentNode)
    }
    visitedNodes.add(node)
    inProcessNodes.delete(node)
    result.push(node)
  }
  for (let node of nodes) {
    visitNode(node)
  }
  return result
}
let getFirstUnorderedNodeDependentOn = (node, currentlyOrderedNodes) => {
  let nodesDependentOnNode = currentlyOrderedNodes.filter(
    currentlyOrderedNode =>
      currentlyOrderedNode.dependencies.includes(
        node.dependencyName ?? node.name,
      ),
  )
  return nodesDependentOnNode.find(firstNodeDependentOnNode => {
    let currentIndexOfNode = currentlyOrderedNodes.indexOf(node)
    let currentIndexOfFirstNodeDependentOnNode = currentlyOrderedNodes.indexOf(
      firstNodeDependentOnNode,
    )
    return currentIndexOfFirstNodeDependentOnNode < currentIndexOfNode
  })
}
export { getFirstUnorderedNodeDependentOn, sortNodesByDependencies }
