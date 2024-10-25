"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reversed = exports.toCodePoints = exports.cachedFn = exports.lazy = exports.assertNever = void 0;
function assertNever(value) {
    throw new Error(`Invalid value: ${value}`);
}
exports.assertNever = assertNever;
function lazy(fn) {
    let cached;
    return () => {
        if (cached === undefined) {
            cached = fn();
        }
        return cached;
    };
}
exports.lazy = lazy;
function cachedFn(fn) {
    const cache = new WeakMap();
    return (key) => {
        let cached = cache.get(key);
        if (cached === undefined) {
            cached = fn(key);
            cache.set(key, cached);
        }
        return cached;
    };
}
exports.cachedFn = cachedFn;
function toCodePoints(s) {
    return [...s].map((c) => c.codePointAt(0));
}
exports.toCodePoints = toCodePoints;
function reversed(iter) {
    return [...iter].reverse();
}
exports.reversed = reversed;
