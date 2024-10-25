import naturalCompare from 'natural-compare-lite'
let compare = (a, b, options) => {
  let orderCoefficient = options.order === 'asc' ? 1 : -1
  let sortingFunction
  let nodeValueGetter = options.nodeValueGetter ?? (node => node.name)
  if (options.type === 'alphabetical') {
    let formatString = getFormatStringFunc(
      options.ignoreCase,
      options.specialCharacters,
    )
    sortingFunction = (aNode, bNode) =>
      formatString(nodeValueGetter(aNode)).localeCompare(
        formatString(nodeValueGetter(bNode)),
      )
  } else if (options.type === 'natural') {
    let prepareNumeric = string => {
      let formattedNumberPattern = /^[+-]?[\d ,_]+(\.[\d ,_]+)?$/
      if (formattedNumberPattern.test(string)) {
        return string.replaceAll(/[ ,_]/g, '')
      }
      return string
    }
    sortingFunction = (aNode, bNode) => {
      let formatString = getFormatStringFunc(
        options.ignoreCase,
        options.specialCharacters,
      )
      return naturalCompare(
        prepareNumeric(formatString(nodeValueGetter(aNode))),
        prepareNumeric(formatString(nodeValueGetter(bNode))),
      )
    }
  } else {
    sortingFunction = (aNode, bNode) => {
      let aSize = aNode.size
      let bSize = bNode.size
      let { maxLineLength } = options
      if (maxLineLength) {
        let isTooLong = (size, node) =>
          size > maxLineLength && node.hasMultipleImportDeclarations
        if (isTooLong(aSize, aNode)) {
          aSize = nodeValueGetter(aNode).length + 10
        }
        if (isTooLong(bSize, bNode)) {
          bSize = nodeValueGetter(bNode).length + 10
        }
      }
      return aSize - bSize
    }
  }
  return orderCoefficient * sortingFunction(a, b)
}
let getFormatStringFunc = (ignoreCase, specialCharacters) => value => {
  let valueToCompare = value
  if (ignoreCase) {
    valueToCompare = valueToCompare.toLowerCase()
  }
  switch (specialCharacters) {
    case 'remove':
      valueToCompare = valueToCompare.replaceAll(/[^A-Za-zÀ-ž]+/g, '')
      break
    case 'trim':
      valueToCompare = valueToCompare.replaceAll(/^[^A-Za-zÀ-ž]+/g, '')
      break
  }
  return valueToCompare.replaceAll(/\s/g, '')
}
export { compare }
