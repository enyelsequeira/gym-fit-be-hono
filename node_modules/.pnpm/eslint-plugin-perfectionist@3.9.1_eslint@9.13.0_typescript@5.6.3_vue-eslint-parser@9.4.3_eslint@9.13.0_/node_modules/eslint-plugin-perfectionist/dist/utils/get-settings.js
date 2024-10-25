'use strict'
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
let getSettings = (settings = {}) => {
  if (!settings.perfectionist) {
    return {}
  }
  let getInvalidOptions = object => {
    let allowedOptions = [
      'partitionByComment',
      'partitionByNewLine',
      'specialCharacters',
      'ignorePattern',
      'ignoreCase',
      'matcher',
      'order',
      'type',
    ]
    return Object.keys(object).filter(key => !allowedOptions.includes(key))
  }
  let perfectionistSettings = settings.perfectionist
  let invalidOptions = getInvalidOptions(perfectionistSettings)
  if (invalidOptions.length) {
    throw new Error(
      'Invalid Perfectionist setting(s): ' + invalidOptions.join(', '),
    )
  }
  return settings.perfectionist
}
exports.getSettings = getSettings
