import { generateRandomString } from '../../../sdk/utilities';
describe('validateClientSecret', function () {
    it('should return true for valid secrets', function () {
        var result = generateRandomString(25);
        expect(result.length).toBe(25);
    });
    it('should return false for invalid secrets - odd length', function () {
        var result = generateRandomString(47);
        expect(result.length).toBe(47);
    });
    it('should return false for invalid secrets', function () {
        var result = generateRandomString(50);
        expect(result.length).toBe(50);
    });
});
