import type { Rule } from "eslint";
import type { Variable } from "eslint-scope";
import type * as ES from "estree";
export declare function findVariable(context: Rule.RuleContext, node: ES.Identifier): Variable | null;
export declare function getPropertyName(context: Rule.RuleContext, node: ES.Property | ES.MemberExpression | ES.MethodDefinition): string | null;
export declare function isParenthesized(context: Rule.RuleContext, node: ES.Node): boolean;
