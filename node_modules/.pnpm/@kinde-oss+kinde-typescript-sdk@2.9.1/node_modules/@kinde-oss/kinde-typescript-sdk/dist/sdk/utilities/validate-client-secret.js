/**
 * Validates that the supplied client secret is in the correct format.
 * @param {string} secret
 * @returns {boolean}
 */
export var validateClientSecret = function (secret) {
    var _a;
    return !!((_a = secret.match('^[a-zA-Z0-9]{40,60}$')) === null || _a === void 0 ? void 0 : _a.length);
};
