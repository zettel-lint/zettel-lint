import { describe, expect, test } from 'vitest';
import { min } from '../../types';

describe('min', () => {
  test('returns undefined when either value is null', () => {
    expect(min(null as unknown as number, 1)).toBeUndefined();
    expect(min(1, null as unknown as number)).toBeUndefined();
  });

  test('returns undefined when either value is undefined', () => {
    expect(min(undefined as unknown as number, 1)).toBeUndefined();
    expect(min(1, undefined as unknown as number)).toBeUndefined();
  });

  test('returns the smaller number when both values are numbers', () => {
    expect(min(1, 2)).toBe(1);
    expect(min(2, 1)).toBe(1);
  });
});