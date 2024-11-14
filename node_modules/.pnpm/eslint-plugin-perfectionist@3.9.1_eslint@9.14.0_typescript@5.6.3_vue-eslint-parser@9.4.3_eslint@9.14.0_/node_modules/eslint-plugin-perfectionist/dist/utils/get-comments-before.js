'use strict'
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
let getCommentsBefore = (node, source) =>
  source.getCommentsBefore(node).filter(comment => {
    let tokenBeforeComment = source.getTokenBefore(comment)
    return (
      (tokenBeforeComment == null
        ? void 0
        : tokenBeforeComment.loc.end.line) !== comment.loc.end.line
    )
  })
exports.getCommentsBefore = getCommentsBefore
