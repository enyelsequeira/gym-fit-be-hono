'use strict'
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
const minimatch = require('minimatch')
let matches = (value, pattern, type) => {
  switch (type) {
    case 'regex':
      return new RegExp(pattern).test(value)
    case 'minimatch':
    default:
      return minimatch.minimatch(value, pattern, {
        nocomment: true,
      })
  }
}
exports.matches = matches
