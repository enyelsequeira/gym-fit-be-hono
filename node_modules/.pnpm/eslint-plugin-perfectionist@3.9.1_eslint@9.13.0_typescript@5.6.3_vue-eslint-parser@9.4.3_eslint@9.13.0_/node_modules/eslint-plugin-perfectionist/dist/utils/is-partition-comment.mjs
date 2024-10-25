import { matches } from './matches.mjs'
let isPartitionComment = (partitionComment, comment, matcher) =>
  (Array.isArray(partitionComment) &&
    partitionComment.some(pattern =>
      matches(comment.trim(), pattern, matcher),
    )) ||
  (typeof partitionComment === 'string' &&
    matches(comment.trim(), partitionComment, matcher)) ||
  partitionComment === true
let hasPartitionComment = (partitionComment, comments, matcher) =>
  comments.some(comment =>
    isPartitionComment(partitionComment, comment.value, matcher),
  )
export { hasPartitionComment, isPartitionComment }
