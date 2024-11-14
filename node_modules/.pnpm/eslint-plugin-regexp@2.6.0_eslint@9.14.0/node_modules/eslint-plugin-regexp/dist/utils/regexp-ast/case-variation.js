"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCaseVariant = exports.getCaseSensitiveFlags = exports.getIgnoreCaseFlags = void 0;
const regexp_ast_analysis_1 = require("regexp-ast-analysis");
const util_1 = require("../util");
exports.getIgnoreCaseFlags = (0, util_1.cachedFn)((flags) => {
    return flags.ignoreCase
        ? flags
        : (0, regexp_ast_analysis_1.toCache)(Object.assign(Object.assign({}, flags), { ignoreCase: true }));
});
exports.getCaseSensitiveFlags = (0, util_1.cachedFn)((flags) => {
    return flags.ignoreCase === false
        ? flags
        : (0, regexp_ast_analysis_1.toCache)(Object.assign(Object.assign({}, flags), { ignoreCase: false }));
});
function isCaseVariant(element, flags, wholeCharacterClass = true) {
    const unicodeLike = Boolean(flags.unicode || flags.unicodeSets);
    const iSet = (0, exports.getIgnoreCaseFlags)(flags);
    const iUnset = (0, exports.getCaseSensitiveFlags)(flags);
    function ccElementIsCaseVariant(e) {
        switch (e.type) {
            case "Character":
                return (0, regexp_ast_analysis_1.toCharSet)(e, iSet).size !== 1;
            case "CharacterClassRange":
                return !(0, regexp_ast_analysis_1.toCharSet)(e, iSet).equals((0, regexp_ast_analysis_1.toCharSet)(e, iUnset));
            case "CharacterSet":
                switch (e.kind) {
                    case "word":
                        return unicodeLike;
                    case "property":
                        return !(0, regexp_ast_analysis_1.toUnicodeSet)(e, iSet).equals((0, regexp_ast_analysis_1.toUnicodeSet)(e, iUnset));
                    default:
                        return false;
                }
            case "CharacterClass":
                if (!wholeCharacterClass) {
                    return e.elements.some(ccElementIsCaseVariant);
                }
                return !(0, regexp_ast_analysis_1.toUnicodeSet)(e, iSet).equals((0, regexp_ast_analysis_1.toUnicodeSet)(e, iUnset));
            case "ExpressionCharacterClass":
                return ccElementIsCaseVariant(e.expression);
            case "ClassIntersection":
            case "ClassSubtraction":
                return !(0, regexp_ast_analysis_1.toUnicodeSet)(e, iSet).equals((0, regexp_ast_analysis_1.toUnicodeSet)(e, iUnset));
            case "ClassStringDisjunction":
                if (!wholeCharacterClass) {
                    return e.alternatives.some(ccElementIsCaseVariant);
                }
                return !(0, regexp_ast_analysis_1.toUnicodeSet)(e, iSet).equals((0, regexp_ast_analysis_1.toUnicodeSet)(e, iUnset));
            case "StringAlternative":
                return e.elements.some(ccElementIsCaseVariant);
            default:
                return (0, util_1.assertNever)(e);
        }
    }
    return (0, regexp_ast_analysis_1.hasSomeDescendant)(element, (d) => {
        switch (d.type) {
            case "Assertion":
                return unicodeLike && d.kind === "word";
            case "Backreference":
                if ((0, regexp_ast_analysis_1.hasSomeDescendant)(element, d.resolved)) {
                    return false;
                }
                return (!(0, regexp_ast_analysis_1.isEmptyBackreference)(d, flags) &&
                    isCaseVariant(d.resolved, flags));
            case "Character":
            case "CharacterClassRange":
            case "CharacterSet":
            case "CharacterClass":
            case "ExpressionCharacterClass":
            case "ClassIntersection":
            case "ClassSubtraction":
            case "ClassStringDisjunction":
            case "StringAlternative":
                return ccElementIsCaseVariant(d);
            default:
                return false;
        }
    }, (d) => {
        return (d.type !== "CharacterClass" &&
            d.type !== "CharacterClassRange" &&
            d.type !== "ExpressionCharacterClass" &&
            d.type !== "ClassStringDisjunction");
    });
}
exports.isCaseVariant = isCaseVariant;
