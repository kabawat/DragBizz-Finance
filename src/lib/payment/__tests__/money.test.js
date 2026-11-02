const { amountsMatch, toMajorAmount, toMinorAmount } = require('../money');

describe('payment money helpers', () => {
    test.each([
        [1.005, 1.01, 101],
        [0.29, 0.29, 29],
        [12.5, 12.5, 1250],
        ['1e-2', 0.01, 1],
        ['.50', 0.5, 50],
        [-0.005, -0.01, -1],
    ])('normalizes %p to major/minor units', (input, major, minor) => {
        expect(toMajorAmount(input)).toBe(major);
        expect(toMinorAmount(input)).toBe(minor);
    });

    test('compares normalized amounts within one paise', () => {
        expect(amountsMatch(10, 10.01)).toBe(true);
        expect(amountsMatch(10, 10.02)).toBe(false);
        expect(amountsMatch('invalid', 10)).toBe(false);
    });
});
