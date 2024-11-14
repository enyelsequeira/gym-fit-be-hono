const allSelectors = [
  'accessor-property',
  'index-signature',
  'constructor',
  'static-block',
  'get-method',
  'set-method',
  'function-property',
  'property',
  'method',
]
const allModifiers = [
  'protected',
  'private',
  'public',
  'static',
  'abstract',
  'override',
  'readonly',
  'decorated',
  'declare',
  'optional',
]
const customGroupSortJsonSchema = {
  type: {
    description: 'Custom group sort type.',
    type: 'string',
    enum: ['alphabetical', 'line-length', 'natural', 'unsorted'],
  },
  order: {
    description: 'Custom group sort order.',
    type: 'string',
    enum: ['desc', 'asc'],
  },
}
const customGroupNameJsonSchema = {
  groupName: {
    description: 'Custom group name.',
    type: 'string',
  },
}
const singleCustomGroupJsonSchema = {
  selector: {
    description: 'Selector filter.',
    type: 'string',
    enum: allSelectors,
  },
  modifiers: {
    description: 'Modifier filters.',
    type: 'array',
    items: {
      type: 'string',
      enum: allModifiers,
    },
  },
  elementNamePattern: {
    description: 'Element name pattern filter.',
    type: 'string',
  },
  elementValuePattern: {
    description: 'Element value pattern filter for properties.',
    type: 'string',
  },
  decoratorNamePattern: {
    description: 'Decorator name pattern filter.',
    type: 'string',
  },
}
export {
  allModifiers,
  allSelectors,
  customGroupNameJsonSchema,
  customGroupSortJsonSchema,
  singleCustomGroupJsonSchema,
}
