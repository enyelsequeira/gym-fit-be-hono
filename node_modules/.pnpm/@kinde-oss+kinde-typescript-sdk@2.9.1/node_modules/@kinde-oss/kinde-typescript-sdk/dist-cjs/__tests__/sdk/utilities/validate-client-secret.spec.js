"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var utilities_1 = require("../../../sdk/utilities");
describe('validateClientSecret', function () {
    it('should return true for valid secrets', function () {
        var validSecret = 'HlibujiUbwbMXofgh12F7Abur5JM5FZCDZHJQenpwEO7UCsNnqzm';
        var result = (0, utilities_1.validateClientSecret)(validSecret);
        expect(result).toBe(true);
    });
    it('should return false for invalid secrets', function () {
        var invalidSecret = '123';
        var result = (0, utilities_1.validateClientSecret)(invalidSecret);
        expect(result).toBe(false);
    });
});
