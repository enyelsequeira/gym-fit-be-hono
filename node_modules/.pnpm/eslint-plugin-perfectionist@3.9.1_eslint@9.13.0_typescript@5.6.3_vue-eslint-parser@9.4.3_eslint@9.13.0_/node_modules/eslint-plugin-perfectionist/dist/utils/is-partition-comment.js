'use strict'
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
const matches = require('./matches.js')
let isPartitionComment = (partitionComment, comment, matcher) =>
  (Array.isArray(partitionComment) &&
    partitionComment.some(pattern =>
      matches.matches(comment.trim(), pattern, matcher),
    )) ||
  (typeof partitionComment === 'string' &&
    matches.matches(comment.trim(), partitionComment, matcher)) ||
  partitionComment === true
let hasPartitionComment = (partitionComment, comments, matcher) =>
  comments.some(comment =>
    isPartitionComment(partitionComment, comment.value, matcher),
  )
exports.hasPartitionComment = hasPartitionComment
exports.isPartitionComment = isPartitionComment
