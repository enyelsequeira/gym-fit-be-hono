'use strict'
const createEslintRule = require('../utils/create-eslint-rule.js')
const getSourceCode = require('../utils/get-source-code.js')
const rangeToDiff = require('../utils/range-to-diff.js')
const getSettings = require('../utils/get-settings.js')
const isPositive = require('../utils/is-positive.js')
const makeFixes = require('../utils/make-fixes.js')
const sortNodes = require('../utils/sort-nodes.js')
const pairwise = require('../utils/pairwise.js')
const complete = require('../utils/complete.js')
const compare = require('../utils/compare.js')
const sortSwitchCase = createEslintRule.createEslintRule({
  name: 'sort-switch-case',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce sorted switch cases.',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          type: {
            description: 'Specifies the sorting method.',
            type: 'string',
            enum: ['alphabetical', 'natural', 'line-length'],
          },
          order: {
            description:
              'Determines whether the sorted items should be in ascending or descending order.',
            type: 'string',
            enum: ['asc', 'desc'],
          },
          ignoreCase: {
            description:
              'Controls whether sorting should be case-sensitive or not.',
            type: 'boolean',
          },
          specialCharacters: {
            description:
              'Controls how special characters should be handled before sorting.',
            type: 'string',
            enum: ['remove', 'trim', 'keep'],
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unexpectedSwitchCaseOrder:
        'Expected "{{right}}" to come before "{{left}}".',
    },
  },
  defaultOptions: [
    {
      type: 'alphabetical',
      order: 'asc',
      ignoreCase: true,
      specialCharacters: 'keep',
    },
  ],
  create: context => ({
    SwitchStatement: node => {
      let settings = getSettings.getSettings(context.settings)
      let options = complete.complete(context.options.at(0), settings, {
        type: 'alphabetical',
        ignoreCase: true,
        specialCharacters: 'keep',
        order: 'asc',
      })
      let sourceCode = getSourceCode.getSourceCode(context)
      let isDiscriminantTrue =
        node.discriminant.type === 'Literal' && node.discriminant.value === true
      let isCasesHasBreak = node.cases
        .filter(caseNode => caseNode.test !== null)
        .every(
          caseNode =>
            caseNode.consequent.length === 0 ||
            caseNode.consequent.some(
              currentConsequent =>
                currentConsequent.type === 'BreakStatement' ||
                currentConsequent.type === 'ReturnStatement' ||
                currentConsequent.type === 'BlockStatement',
            ),
        )
      if (!isDiscriminantTrue && isCasesHasBreak) {
        let nodes = node.cases.map(caseNode => {
          var _a, _b
          let name
          let isDefaultClause = false
          if (((_a = caseNode.test) == null ? void 0 : _a.type) === 'Literal') {
            name = `${caseNode.test.value}`
          } else if (caseNode.test === null) {
            name = 'default'
            isDefaultClause = true
          } else {
            name = sourceCode.text.slice(...caseNode.test.range)
          }
          return {
            size: rangeToDiff.rangeToDiff(
              ((_b = caseNode.test) == null ? void 0 : _b.range) ??
                caseNode.range,
            ),
            node: caseNode,
            isDefaultClause,
            name,
          }
        })
        pairwise.pairwise(nodes, (left, right, iteration) => {
          let compareValue
          let lefter = nodes.at(iteration - 1)
          let isCaseGrouped =
            (lefter == null ? void 0 : lefter.node.consequent.length) === 0 &&
            left.node.consequent.length !== 0
          let isGroupContainsDefault = group =>
            group.some(currentNode => currentNode.isDefaultClause)
          let leftCaseGroup = [left]
          let rightCaseGroup = [right]
          for (let i = iteration - 1; i >= 0; i--) {
            if (nodes.at(i).node.consequent.length === 0) {
              leftCaseGroup.unshift(nodes.at(i))
            } else {
              break
            }
          }
          if (right.node.consequent.length === 0) {
            for (let i = iteration + 1; i < nodes.length; i++) {
              if (nodes.at(i).node.consequent.length === 0) {
                rightCaseGroup.push(nodes.at(i))
              } else {
                rightCaseGroup.push(nodes.at(i))
                break
              }
            }
          }
          if (isGroupContainsDefault(leftCaseGroup)) {
            compareValue = true
          } else if (isGroupContainsDefault(rightCaseGroup)) {
            compareValue = false
          } else if (isCaseGrouped) {
            compareValue = isPositive.isPositive(
              compare.compare(leftCaseGroup[0], right, options),
            )
          } else {
            compareValue = isPositive.isPositive(
              compare.compare(left, right, options),
            )
          }
          if (compareValue) {
            context.report({
              messageId: 'unexpectedSwitchCaseOrder',
              data: {
                left: left.name,
                right: right.name,
              },
              node: right.node,
              fix: fixer => {
                let additionalFixes = []
                let nodeGroups = nodes.reduce(
                  (accumulator, currentNode, index) => {
                    var _a
                    if (index === 0) {
                      accumulator.at(-1).push(currentNode)
                    } else if (
                      ((_a = accumulator.at(-1).at(-1)) == null
                        ? void 0
                        : _a.node.consequent.length) === 0
                    ) {
                      accumulator.at(-1).push(currentNode)
                    } else {
                      accumulator.push([currentNode])
                    }
                    return accumulator
                  },
                  [[]],
                )
                let sortedNodeGroups = nodeGroups
                  .map(group => {
                    var _a, _b
                    let sortedGroup = sortNodes
                      .sortNodes(group, options)
                      .sort((a, b) => {
                        if (b.isDefaultClause) {
                          return -1
                        }
                        return 1
                      })
                    if (group.at(-1).name !== sortedGroup.at(-1).name) {
                      let consequentNodeIndex = sortedGroup.findIndex(
                        currentNode => currentNode.node.consequent.length !== 0,
                      )
                      let firstSortedNodeConsequent =
                        sortedGroup.at(consequentNodeIndex).node.consequent
                      let consequentStart =
                        (_a = firstSortedNodeConsequent.at(0)) == null
                          ? void 0
                          : _a.range.at(0)
                      let consequentEnd =
                        (_b = firstSortedNodeConsequent.at(-1)) == null
                          ? void 0
                          : _b.range.at(1)
                      let lastNode = group.at(-1).node
                      if (consequentStart && consequentEnd && lastNode.test) {
                        lastNode.range = [
                          lastNode.range.at(0),
                          lastNode.test.range.at(1) + 1,
                        ]
                        additionalFixes.push(
                          ...makeFixes.makeFixes(
                            fixer,
                            group,
                            sortedGroup,
                            sourceCode,
                          ),
                          fixer.removeRange([
                            lastNode.range.at(1),
                            consequentEnd,
                          ]),
                          fixer.insertTextAfter(
                            lastNode,
                            sourceCode.text.slice(
                              lastNode.range.at(1),
                              consequentEnd,
                            ),
                          ),
                        )
                      }
                    }
                    return sortedGroup
                  })
                  .sort((a, b) => {
                    if (isGroupContainsDefault(a)) {
                      return 1
                    } else if (isGroupContainsDefault(b)) {
                      return -1
                    }
                    return compare.compare(a.at(0), b.at(0), options)
                  })
                let sortedNodes = sortedNodeGroups.flat()
                for (let max = sortedNodes.length, i = 0; i < max; i++) {
                  if (sortedNodes.at(i).isDefaultClause) {
                    sortedNodes.push(sortedNodes.splice(i, 1).at(0))
                  }
                }
                if (additionalFixes.length) {
                  return additionalFixes
                }
                return makeFixes.makeFixes(
                  fixer,
                  nodes,
                  sortedNodes,
                  sourceCode,
                )
              },
            })
          }
        })
      }
    },
  }),
})
module.exports = sortSwitchCase
