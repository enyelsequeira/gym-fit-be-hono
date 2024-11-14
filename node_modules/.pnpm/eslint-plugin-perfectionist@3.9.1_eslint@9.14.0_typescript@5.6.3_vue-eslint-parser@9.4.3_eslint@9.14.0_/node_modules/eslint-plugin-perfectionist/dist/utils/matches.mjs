import { minimatch } from 'minimatch'
let matches = (value, pattern, type) => {
  switch (type) {
    case 'regex':
      return new RegExp(pattern).test(value)
    case 'minimatch':
    default:
      return minimatch(value, pattern, {
        nocomment: true,
      })
  }
}
export { matches }
