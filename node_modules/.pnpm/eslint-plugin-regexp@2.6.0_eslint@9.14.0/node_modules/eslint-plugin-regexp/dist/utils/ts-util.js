"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNull = exports.isBigIntLike = exports.isBooleanLike = exports.isNumberLike = exports.isStringLine = exports.isUnknown = exports.isAny = exports.isTypeParameter = exports.isUnionOrIntersection = exports.isReferenceObject = exports.isObject = exports.isClassOrInterface = exports.isArrayLikeObject = exports.getTypeScript = exports.getTypeScriptTools = void 0;
function getTypeScriptTools(context) {
    const sourceCode = context.sourceCode;
    const ts = getTypeScript();
    const tsNodeMap = sourceCode.parserServices.esTreeNodeToTSNodeMap;
    const usedTS = Boolean(ts && tsNodeMap);
    const hasFullTypeInformation = usedTS && sourceCode.parserServices.hasFullTypeInformation !== false;
    const checker = (hasFullTypeInformation &&
        sourceCode.parserServices.program &&
        sourceCode.parserServices.program.getTypeChecker()) ||
        null;
    return {
        tsNodeMap: tsNodeMap || new Map(),
        checker,
        usedTS,
        hasFullTypeInformation,
    };
}
exports.getTypeScriptTools = getTypeScriptTools;
let cacheTypeScript;
function getTypeScript() {
    try {
        return (cacheTypeScript !== null && cacheTypeScript !== void 0 ? cacheTypeScript : (cacheTypeScript = require("typescript")));
    }
    catch (e) {
        if (e.code === "MODULE_NOT_FOUND") {
            return undefined;
        }
        if (typeof require === "undefined" ||
            typeof require.define === "function") {
            return undefined;
        }
        if (typeof e.message === "string" &&
            e.message.includes("Dynamic require") &&
            e.message.includes("is not supported")) {
            return undefined;
        }
        throw e;
    }
}
exports.getTypeScript = getTypeScript;
function isArrayLikeObject(tsType) {
    const ts = getTypeScript();
    return (isObject(tsType) &&
        (tsType.objectFlags &
            (ts.ObjectFlags.ArrayLiteral |
                ts.ObjectFlags.EvolvingArray |
                ts.ObjectFlags.Tuple)) !==
            0);
}
exports.isArrayLikeObject = isArrayLikeObject;
function isClassOrInterface(tsType) {
    const ts = getTypeScript();
    return (isObject(tsType) &&
        (tsType.objectFlags & ts.ObjectFlags.ClassOrInterface) !== 0);
}
exports.isClassOrInterface = isClassOrInterface;
function isObject(tsType) {
    const ts = getTypeScript();
    return (tsType.flags & ts.TypeFlags.Object) !== 0;
}
exports.isObject = isObject;
function isReferenceObject(tsType) {
    const ts = getTypeScript();
    return (isObject(tsType) &&
        (tsType.objectFlags & ts.ObjectFlags.Reference) !== 0);
}
exports.isReferenceObject = isReferenceObject;
function isUnionOrIntersection(tsType) {
    const ts = getTypeScript();
    return (tsType.flags & ts.TypeFlags.UnionOrIntersection) !== 0;
}
exports.isUnionOrIntersection = isUnionOrIntersection;
function isTypeParameter(tsType) {
    const ts = getTypeScript();
    return (tsType.flags & ts.TypeFlags.TypeParameter) !== 0;
}
exports.isTypeParameter = isTypeParameter;
function isAny(tsType) {
    const ts = getTypeScript();
    return (tsType.flags & ts.TypeFlags.Any) !== 0;
}
exports.isAny = isAny;
function isUnknown(tsType) {
    const ts = getTypeScript();
    return (tsType.flags & ts.TypeFlags.Unknown) !== 0;
}
exports.isUnknown = isUnknown;
function isStringLine(tsType) {
    const ts = getTypeScript();
    return (tsType.flags & ts.TypeFlags.StringLike) !== 0;
}
exports.isStringLine = isStringLine;
function isNumberLike(tsType) {
    const ts = getTypeScript();
    return (tsType.flags & ts.TypeFlags.NumberLike) !== 0;
}
exports.isNumberLike = isNumberLike;
function isBooleanLike(tsType) {
    const ts = getTypeScript();
    return (tsType.flags & ts.TypeFlags.BooleanLike) !== 0;
}
exports.isBooleanLike = isBooleanLike;
function isBigIntLike(tsType) {
    const ts = getTypeScript();
    return (tsType.flags & ts.TypeFlags.BigIntLike) !== 0;
}
exports.isBigIntLike = isBigIntLike;
function isNull(tsType) {
    const ts = getTypeScript();
    return (tsType.flags & ts.TypeFlags.Null) !== 0;
}
exports.isNull = isNull;
