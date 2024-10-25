import { validateClientSecret } from '../../../sdk/utilities';
describe('validateClientSecret', function () {
    it('should return true for valid secrets', function () {
        var validSecret = 'HlibujiUbwbMXofgh12F7Abur5JM5FZCDZHJQenpwEO7UCsNnqzm';
        var result = validateClientSecret(validSecret);
        expect(result).toBe(true);
    });
    it('should return false for invalid secrets', function () {
        var invalidSecret = '123';
        var result = validateClientSecret(invalidSecret);
        expect(result).toBe(false);
    });
});
