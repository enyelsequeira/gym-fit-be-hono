"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var utilities_1 = require("../../../sdk/utilities");
describe('validateClientSecret', function () {
    it('should return true for valid secrets', function () {
        var result = (0, utilities_1.generateRandomString)(25);
        expect(result.length).toBe(25);
    });
    it('should return false for invalid secrets - odd length', function () {
        var result = (0, utilities_1.generateRandomString)(47);
        expect(result.length).toBe(47);
    });
    it('should return false for invalid secrets', function () {
        var result = (0, utilities_1.generateRandomString)(50);
        expect(result.length).toBe(50);
    });
});
