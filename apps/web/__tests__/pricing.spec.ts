import { describe, expect, test } from 'vitest';
import { getMonthlyPrice, getSavingsPercentage } from '../lib/pricing';

describe('membership pricing helpers', () => {
  test.each([
    [2000, 1, 2000],
    [5500, 3, 5500 / 3],
    [10000, 6, 10000 / 6],
    [16000, 12, 16000 / 12],
  ])('calculates the monthly price for %i MKD over %i months', (price, months, expected) => {
    expect(getMonthlyPrice(price, months)).toBeCloseTo(expected);
  });

  test.each([
    [2000, 1, 0],
    [5500, 3, 8],
    [10000, 6, 17],
    [16000, 12, 33],
  ])('calculates savings for %i MKD over %i months', (price, months, expected) => {
    expect(getSavingsPercentage(price, months, 2000)).toBe(expected);
  });

  test('rejects invalid plan durations and baseline prices', () => {
    expect(() => getMonthlyPrice(2000, 0)).toThrow(RangeError);
    expect(() => getSavingsPercentage(2000, 1, 0)).toThrow(RangeError);
  });
});
