import { ClassicConfig } from '@typescript-eslint/utils/ts-eslint'
import { FlatConfig } from '@typescript-eslint/utils/ts-eslint'
import { RuleListener } from '@typescript-eslint/utils/ts-eslint'
import { RuleModule } from '@typescript-eslint/utils/ts-eslint'

declare type AbstractModifier = 'abstract'

declare type AccessorPropertyGroup =
  `${PublicOrProtectedOrPrivateModifierPrefix}${StaticOrAbstractModifierPrefix}${OverrideModifierPrefix}${DecoratedModifierPrefix}${AccessorPropertySelector}`

declare type AccessorPropertySelector = 'accessor-property'

declare type AdvancedSingleCustomGroup<T extends Selector> = {
  decoratorNamePattern?: string
  elementValuePattern?: string
  elementNamePattern?: string
} & BaseSingleCustomGroup<T>

/**
 * Only used in code as well
 */
declare interface AllowedModifiersPerSelector {
  property:
    | PublicOrProtectedOrPrivateModifier
    | DecoratedModifier
    | AbstractModifier
    | OverrideModifier
    | ReadonlyModifier
    | OptionalModifier
    | DeclareModifier
    | StaticModifier
  method:
    | PublicOrProtectedOrPrivateModifier
    | DecoratedModifier
    | AbstractModifier
    | OverrideModifier
    | OptionalModifier
    | StaticModifier
  'accessor-property':
    | PublicOrProtectedOrPrivateModifier
    | DecoratedModifier
    | AbstractModifier
    | OverrideModifier
    | StaticModifier
  'function-property':
    | PublicOrProtectedOrPrivateModifier
    | DecoratedModifier
    | OverrideModifier
    | ReadonlyModifier
    | StaticModifier
  'set-method':
    | PublicOrProtectedOrPrivateModifier
    | DecoratedModifier
    | AbstractModifier
    | OverrideModifier
    | StaticModifier
  'get-method': AllowedModifiersPerSelector['set-method']
  'index-signature': ReadonlyModifier | StaticModifier
  constructor: PublicOrProtectedOrPrivateModifier
  'static-block': never
}

declare interface BaseSingleCustomGroup<T extends Selector> {
  modifiers?: AllowedModifiersPerSelector[T][]
  selector?: T
}

declare type ConstructorGroup =
  `${PublicOrProtectedOrPrivateModifierPrefix}${ConstructorSelector}`

declare type ConstructorSelector = 'constructor'

declare type CustomGroup = (
  | {
      order?: SortClassesOptions[0]['order']
      type?: SortClassesOptions[0]['type']
    }
  | {
      type?: 'unsorted'
    }
) &
  (SingleCustomGroup | CustomGroupBlock) & {
    groupName: string
  }

declare interface CustomGroupBlock {
  anyOf: SingleCustomGroup[]
}

declare type DeclareModifier = 'declare'

declare type DeclareModifierPrefix = WithDashSuffixOrEmpty<DeclareModifier>

declare type DeclarePropertyGroup =
  `${DeclareModifierPrefix}${PublicOrProtectedOrPrivateModifierPrefix}${StaticOrAbstractModifierPrefix}${ReadonlyModifierPrefix}${OptionalModifierPrefix}${PropertySelector}`

declare type DecoratedModifier = 'decorated'

declare type DecoratedModifierPrefix = WithDashSuffixOrEmpty<DecoratedModifier>

declare const _default: {
  configs: {
    'recommended-alphabetical-legacy': ClassicConfig.Config
    'recommended-line-length-legacy': ClassicConfig.Config
    'recommended-natural-legacy': ClassicConfig.Config
    'recommended-alphabetical': FlatConfig.Config
    'recommended-line-length': FlatConfig.Config
    'recommended-natural': FlatConfig.Config
  }
  rules: {
    'sort-variable-declarations': RuleModule<
      | 'unexpectedVariableDeclarationsDependencyOrder'
      | 'unexpectedVariableDeclarationsOrder',
      [
        Partial<{
          type: 'alphabetical' | 'line-length' | 'natural'
          partitionByComment: string[] | boolean | string
          specialCharacters: 'remove' | 'trim' | 'keep'
          matcher: 'minimatch' | 'regex'
          partitionByNewLine: boolean
          order: 'desc' | 'asc'
          ignoreCase: boolean
        }>,
      ],
      unknown,
      RuleListener
    >
    'sort-intersection-types': RuleModule<
      | 'unexpectedIntersectionTypesGroupOrder'
      | 'unexpectedIntersectionTypesOrder',
      [
        Partial<{
          type: 'alphabetical' | 'line-length' | 'natural'
          partitionByComment: string[] | boolean | string
          specialCharacters: 'remove' | 'trim' | 'keep'
          matcher: 'minimatch' | 'regex'
          groups: (
            | (
                | 'object'
                | 'function'
                | 'operator'
                | 'unknown'
                | 'intersection'
                | 'conditional'
                | 'keyword'
                | 'literal'
                | 'nullish'
                | 'import'
                | 'named'
                | 'tuple'
                | 'union'
              )[]
            | (
                | 'object'
                | 'function'
                | 'operator'
                | 'unknown'
                | 'intersection'
                | 'conditional'
                | 'keyword'
                | 'literal'
                | 'nullish'
                | 'import'
                | 'named'
                | 'tuple'
                | 'union'
              )
          )[]
          partitionByNewLine: boolean
          order: 'desc' | 'asc'
          ignoreCase: boolean
        }>,
      ],
      unknown,
      RuleListener
    >
    'sort-svelte-attributes': RuleModule<
      | 'unexpectedSvelteAttributesGroupOrder'
      | 'unexpectedSvelteAttributesOrder',
      [
        Partial<{
          customGroups: {
            [x: string]: string | string[]
          }
          type: 'alphabetical' | 'line-length' | 'natural'
          specialCharacters: 'remove' | 'trim' | 'keep'
          groups: (string | string[])[]
          matcher: 'minimatch' | 'regex'
          order: 'desc' | 'asc'
          ignoreCase: boolean
        }>,
      ],
      unknown,
      RuleListener
    >
    'sort-astro-attributes': RuleModule<
      'unexpectedAstroAttributesGroupOrder' | 'unexpectedAstroAttributesOrder',
      [
        Partial<{
          customGroups: {
            [x: string]: string | string[]
          }
          type: 'alphabetical' | 'line-length' | 'natural'
          specialCharacters: 'remove' | 'trim' | 'keep'
          groups: (string | string[])[]
          matcher: 'minimatch' | 'regex'
          order: 'desc' | 'asc'
          ignoreCase: boolean
        }>,
      ],
      unknown,
      RuleListener
    >
    'sort-vue-attributes': RuleModule<
      'unexpectedVueAttributesGroupOrder' | 'unexpectedVueAttributesOrder',
      [
        Partial<{
          customGroups: {
            [x: string]: string | string[]
          }
          type: 'alphabetical' | 'line-length' | 'natural'
          specialCharacters: 'remove' | 'trim' | 'keep'
          groups: (string | string[])[]
          matcher: 'minimatch' | 'regex'
          order: 'desc' | 'asc'
          ignoreCase: boolean
        }>,
      ],
      unknown,
      RuleListener
    >
    'sort-array-includes': RuleModule<
      'unexpectedArrayIncludesOrder',
      Options,
      unknown,
      RuleListener
    >
    'sort-named-imports': RuleModule<
      'unexpectedNamedImportsOrder',
      [
        Partial<{
          groupKind: 'values-first' | 'types-first' | 'mixed'
          type: 'alphabetical' | 'line-length' | 'natural'
          partitionByComment: string[] | boolean | string
          specialCharacters: 'remove' | 'trim' | 'keep'
          matcher: 'minimatch' | 'regex'
          partitionByNewLine: boolean
          order: 'desc' | 'asc'
          ignoreAlias: boolean
          ignoreCase: boolean
        }>,
      ],
      unknown,
      RuleListener
    >
    'sort-named-exports': RuleModule<
      'unexpectedNamedExportsOrder',
      [
        Partial<{
          groupKind: 'values-first' | 'types-first' | 'mixed'
          type: 'alphabetical' | 'line-length' | 'natural'
          partitionByComment: string[] | boolean | string
          specialCharacters: 'remove' | 'trim' | 'keep'
          matcher: 'minimatch' | 'regex'
          partitionByNewLine: boolean
          order: 'desc' | 'asc'
          ignoreCase: boolean
        }>,
      ],
      unknown,
      RuleListener
    >
    'sort-object-types': RuleModule<
      'unexpectedObjectTypesGroupOrder' | 'unexpectedObjectTypesOrder',
      [
        Partial<{
          groupKind: 'required-first' | 'optional-first' | 'mixed'
          customGroups: {
            [x: string]: string | string[]
          }
          type: 'alphabetical' | 'line-length' | 'natural'
          partitionByComment: string[] | boolean | string
          specialCharacters: 'remove' | 'trim' | 'keep'
          groups: (string | string[])[]
          matcher: 'minimatch' | 'regex'
          partitionByNewLine: boolean
          order: 'desc' | 'asc'
          ignoreCase: boolean
        }>,
      ],
      unknown,
      RuleListener
    >
    'sort-union-types': RuleModule<
      'unexpectedUnionTypesGroupOrder' | 'unexpectedUnionTypesOrder',
      [
        Partial<{
          type: 'alphabetical' | 'line-length' | 'natural'
          partitionByComment: string[] | boolean | string
          specialCharacters: 'remove' | 'trim' | 'keep'
          matcher: 'minimatch' | 'regex'
          groups: (
            | (
                | 'object'
                | 'function'
                | 'operator'
                | 'unknown'
                | 'intersection'
                | 'conditional'
                | 'keyword'
                | 'literal'
                | 'nullish'
                | 'import'
                | 'named'
                | 'tuple'
                | 'union'
              )[]
            | (
                | 'object'
                | 'function'
                | 'operator'
                | 'unknown'
                | 'intersection'
                | 'conditional'
                | 'keyword'
                | 'literal'
                | 'nullish'
                | 'import'
                | 'named'
                | 'tuple'
                | 'union'
              )
          )[]
          partitionByNewLine: boolean
          order: 'desc' | 'asc'
          ignoreCase: boolean
        }>,
      ],
      unknown,
      RuleListener
    >
    'sort-switch-case': RuleModule<
      'unexpectedSwitchCaseOrder',
      [
        Partial<{
          type: 'alphabetical' | 'line-length' | 'natural'
          specialCharacters: 'remove' | 'trim' | 'keep'
          order: 'desc' | 'asc'
          ignoreCase: boolean
        }>,
      ],
      unknown,
      RuleListener
    >
    'sort-interfaces': RuleModule<
      | 'unexpectedInterfacePropertiesGroupOrder'
      | 'unexpectedInterfacePropertiesOrder',
      [
        Partial<{
          groupKind: 'optional-first' | 'required-first' | 'mixed'
          customGroups: {
            [key: string]: string[] | string
          }
          type: 'alphabetical' | 'line-length' | 'natural'
          partitionByComment: string[] | boolean | string
          specialCharacters: 'remove' | 'trim' | 'keep'
          groups: (string | string[])[]
          matcher: 'minimatch' | 'regex'
          partitionByNewLine: boolean
          ignorePattern: string[]
          order: 'desc' | 'asc'
          ignoreCase: boolean
        }>,
      ],
      unknown,
      RuleListener
    >
    'sort-jsx-props': RuleModule<
      'unexpectedJSXPropsGroupOrder' | 'unexpectedJSXPropsOrder',
      [
        Partial<{
          customGroups: {
            [x: string]: string | string[]
          }
          type: 'alphabetical' | 'line-length' | 'natural'
          specialCharacters: 'remove' | 'trim' | 'keep'
          groups: (string | string[])[]
          matcher: 'minimatch' | 'regex'
          ignorePattern: string[]
          order: 'desc' | 'asc'
          ignoreCase: boolean
        }>,
      ],
      unknown,
      RuleListener
    >
    'sort-classes': RuleModule<
      | 'unexpectedClassesDependencyOrder'
      | 'unexpectedClassesGroupOrder'
      | 'unexpectedClassesOrder',
      SortClassesOptions,
      unknown,
      RuleListener
    >
    'sort-imports': RuleModule<
      MESSAGE_ID,
      Options_2<string[]>,
      unknown,
      RuleListener
    >
    'sort-exports': RuleModule<
      'unexpectedExportsOrder',
      [
        Partial<{
          groupKind: 'values-first' | 'types-first' | 'mixed'
          type: 'alphabetical' | 'line-length' | 'natural'
          partitionByComment: string[] | boolean | string
          specialCharacters: 'remove' | 'trim' | 'keep'
          matcher: 'minimatch' | 'regex'
          partitionByNewLine: boolean
          order: 'desc' | 'asc'
          ignoreCase: boolean
        }>,
      ],
      unknown,
      RuleListener
    >
    'sort-objects': RuleModule<
      | 'unexpectedObjectsDependencyOrder'
      | 'unexpectedObjectsGroupOrder'
      | 'unexpectedObjectsOrder',
      [
        Partial<{
          customGroups: {
            [key: string]: string[] | string
          }
          type: 'alphabetical' | 'line-length' | 'natural'
          partitionByComment: string[] | boolean | string
          specialCharacters: 'remove' | 'trim' | 'keep'
          matcher: 'minimatch' | 'regex'
          groups: (string[] | string)[]
          partitionByNewLine: boolean
          styledComponents: boolean
          destructureOnly: boolean
          ignorePattern: string[]
          order: 'desc' | 'asc'
          ignoreCase: boolean
        }>,
      ],
      unknown,
      RuleListener
    >
    'sort-enums': RuleModule<
      'unexpectedEnumsDependencyOrder' | 'unexpectedEnumsOrder',
      Options_3,
      unknown,
      RuleListener
    >
    'sort-sets': RuleModule<
      'unexpectedSetsOrder',
      Options,
      unknown,
      RuleListener
    >
    'sort-maps': RuleModule<
      'unexpectedMapElementsOrder',
      [
        Partial<{
          type: 'alphabetical' | 'line-length' | 'natural'
          partitionByComment: string[] | boolean | string
          specialCharacters: 'remove' | 'trim' | 'keep'
          matcher: 'minimatch' | 'regex'
          partitionByNewLine: boolean
          order: 'desc' | 'asc'
          ignoreCase: boolean
        }>,
      ],
      unknown,
      RuleListener
    >
  }
  name: string
}

declare type FunctionPropertyGroup =
  `${PublicOrProtectedOrPrivateModifierPrefix}${StaticModifierPrefix}${OverrideModifierPrefix}${ReadonlyModifierPrefix}${DecoratedModifierPrefix}${FunctionPropertySelector}`

declare type FunctionPropertySelector = 'function-property'

declare type GetMethodOrSetMethodGroup =
  `${PublicOrProtectedOrPrivateModifierPrefix}${StaticOrAbstractModifierPrefix}${OverrideModifierPrefix}${DecoratedModifierPrefix}${GetMethodOrSetMethodSelector}`

declare type GetMethodOrSetMethodSelector =
  | GetMethodSelector
  | SetMethodSelector

declare type GetMethodSelector = 'get-method'

/**
 * Some invalid combinations are still handled by this type, such as
 * - private abstract X
 * - abstract decorated X
 * Only used in code, so I don't know if it's worth maintaining this.
 */
declare type Group =
  | GetMethodOrSetMethodGroup
  | NonDeclarePropertyGroup
  | AccessorPropertyGroup
  | FunctionPropertyGroup
  | DeclarePropertyGroup
  | IndexSignatureGroup
  | ConstructorGroup
  | StaticBlockGroup
  | MethodGroup
  | 'unknown'
  | string

declare type Group_2<T extends string[]> =
  | 'side-effect-style'
  | 'external-type'
  | 'internal-type'
  | 'builtin-type'
  | 'sibling-type'
  | 'parent-type'
  | 'side-effect'
  | 'index-type'
  | 'internal'
  | 'external'
  | T[number]
  | 'sibling'
  | 'unknown'
  | 'builtin'
  | 'parent'
  | 'object'
  | 'index'
  | 'style'
  | 'type'

declare type IndexSignatureGroup =
  `${StaticModifierPrefix}${ReadonlyModifierPrefix}${IndexSignatureSelector}`

declare type IndexSignatureSelector = 'index-signature'

declare type MESSAGE_ID =
  | 'missedSpacingBetweenImports'
  | 'unexpectedImportsGroupOrder'
  | 'extraSpacingBetweenImports'
  | 'unexpectedImportsOrder'

declare type MethodGroup =
  `${PublicOrProtectedOrPrivateModifierPrefix}${StaticOrAbstractModifierPrefix}${OverrideModifierPrefix}${DecoratedModifierPrefix}${OptionalModifierPrefix}${MethodSelector}`

declare type MethodSelector = 'method'

declare type NonDeclarePropertyGroup =
  `${PublicOrProtectedOrPrivateModifierPrefix}${StaticOrAbstractModifierPrefix}${OverrideModifierPrefix}${ReadonlyModifierPrefix}${DecoratedModifierPrefix}${OptionalModifierPrefix}${PropertySelector}`

declare type OptionalModifier = 'optional'

declare type OptionalModifierPrefix = WithDashSuffixOrEmpty<OptionalModifier>

declare type Options = [
  Partial<{
    groupKind: 'literals-first' | 'spreads-first' | 'mixed'
    type: 'alphabetical' | 'line-length' | 'natural'
    partitionByComment: string[] | boolean | string
    specialCharacters: 'remove' | 'trim' | 'keep'
    matcher: 'minimatch' | 'regex'
    partitionByNewLine: boolean
    order: 'desc' | 'asc'
    ignoreCase: boolean
  }>,
]

declare type Options_2<T extends string[]> = [
  Partial<{
    customGroups: {
      value?: {
        [key in T[number]]: string[] | string
      }
      type?: {
        [key in T[number]]: string[] | string
      }
    }
    type: 'alphabetical' | 'line-length' | 'natural'
    newlinesBetween: 'ignore' | 'always' | 'never'
    specialCharacters: 'remove' | 'trim' | 'keep'
    groups: (Group_2<T>[] | Group_2<T>)[]
    matcher: 'minimatch' | 'regex'
    environment: 'node' | 'bun'
    internalPattern: string[]
    sortSideEffects: boolean
    maxLineLength?: number
    order: 'desc' | 'asc'
    ignoreCase: boolean
  }>,
]

declare type Options_3 = [
  Partial<{
    type: 'alphabetical' | 'line-length' | 'natural'
    partitionByComment: string[] | boolean | string
    specialCharacters: 'remove' | 'trim' | 'keep'
    matcher: 'minimatch' | 'regex'
    partitionByNewLine: boolean
    forceNumericSort: boolean
    order: 'desc' | 'asc'
    sortByValue: boolean
    ignoreCase: boolean
  }>,
]

declare type OverrideModifier = 'override'

declare type OverrideModifierPrefix = WithDashSuffixOrEmpty<OverrideModifier>

declare type PrivateModifier = 'private'

declare type PropertySelector = 'property'

declare type ProtectedModifier = 'protected'

declare type PublicModifier = 'public'

declare type PublicOrProtectedOrPrivateModifier =
  | ProtectedModifier
  | PrivateModifier
  | PublicModifier

declare type PublicOrProtectedOrPrivateModifierPrefix = WithDashSuffixOrEmpty<
  ProtectedModifier | PrivateModifier | PublicModifier
>

declare type ReadonlyModifier = 'readonly'

declare type ReadonlyModifierPrefix = WithDashSuffixOrEmpty<ReadonlyModifier>

declare type Selector =
  | AccessorPropertySelector
  | FunctionPropertySelector
  | IndexSignatureSelector
  | ConstructorSelector
  | StaticBlockSelector
  | GetMethodSelector
  | SetMethodSelector
  | PropertySelector
  | MethodSelector

declare type SetMethodSelector = 'set-method'

declare type SingleCustomGroup =
  | AdvancedSingleCustomGroup<FunctionPropertySelector>
  | AdvancedSingleCustomGroup<AccessorPropertySelector>
  | BaseSingleCustomGroup<IndexSignatureSelector>
  | AdvancedSingleCustomGroup<GetMethodSelector>
  | AdvancedSingleCustomGroup<SetMethodSelector>
  | AdvancedSingleCustomGroup<PropertySelector>
  | BaseSingleCustomGroup<StaticBlockSelector>
  | BaseSingleCustomGroup<ConstructorSelector>
  | AdvancedSingleCustomGroup<MethodSelector>

declare type SortClassesOptions = [
  Partial<{
    customGroups:
      | {
          [key: string]: string[] | string
        }
      | CustomGroup[]
    type: 'alphabetical' | 'line-length' | 'natural'
    partitionByComment: string[] | boolean | string
    specialCharacters: 'remove' | 'trim' | 'keep'
    matcher: 'minimatch' | 'regex'
    groups: (Group[] | Group)[]
    order: 'desc' | 'asc'
    ignoreCase: boolean
  }>,
]

declare type StaticBlockGroup = `${StaticBlockSelector}`

declare type StaticBlockSelector = 'static-block'

declare type StaticModifier = 'static'

declare type StaticModifierPrefix = WithDashSuffixOrEmpty<StaticModifier>

declare type StaticOrAbstractModifierPrefix = WithDashSuffixOrEmpty<
  AbstractModifier | StaticModifier
>

declare type WithDashSuffixOrEmpty<T extends string> = `${T}-` | ''

export {}
export = _default
