'use strict'
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
const utils = require('@typescript-eslint/utils')
const isPartitionComment = require('./is-partition-comment.js')
const getCommentsBefore = require('./get-comments-before.js')
let getNodeRange = (node, sourceCode, additionalOptions) => {
  var _a
  let start = node.range.at(0)
  let end = node.range.at(1)
  let raw = sourceCode.text.slice(start, end)
  if (utils.ASTUtils.isParenthesized(node, sourceCode)) {
    let bodyOpeningParen = sourceCode.getTokenBefore(
      node,
      utils.ASTUtils.isOpeningParenToken,
    )
    let bodyClosingParen = sourceCode.getTokenAfter(
      node,
      utils.ASTUtils.isClosingParenToken,
    )
    start = bodyOpeningParen.range.at(0)
    end = bodyClosingParen.range.at(1)
  }
  if (raw.endsWith(';') || raw.endsWith(',')) {
    let tokensAfter = sourceCode.getTokensAfter(node, {
      includeComments: true,
      count: 2,
    })
    if (
      node.loc.start.line ===
      ((_a = tokensAfter.at(1)) == null ? void 0 : _a.loc.start.line)
    ) {
      end -= 1
    }
  }
  let comments = getCommentsBefore.getCommentsBefore(node, sourceCode)
  let partitionComment =
    (additionalOptions == null
      ? void 0
      : additionalOptions.partitionByComment) ?? false
  let partitionCommentMatcher =
    (additionalOptions == null ? void 0 : additionalOptions.matcher) ??
    'minimatch'
  let relevantTopComment
  for (let i = comments.length - 1; i >= 0; i--) {
    let comment = comments[i]
    if (
      isPartitionComment.isPartitionComment(
        partitionComment,
        comment.value,
        partitionCommentMatcher,
      )
    ) {
      break
    }
    let previousCommentOrNodeStartLine =
      i === comments.length - 1
        ? node.loc.start.line
        : comments[i + 1].loc.start.line
    if (comment.loc.end.line !== previousCommentOrNodeStartLine - 1) {
      break
    }
    relevantTopComment = comment
  }
  if (relevantTopComment) {
    start = relevantTopComment.range.at(0)
  }
  return [start, end]
}
exports.getNodeRange = getNodeRange
