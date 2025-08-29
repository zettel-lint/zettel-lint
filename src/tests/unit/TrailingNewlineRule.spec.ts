// Tests for TrailingNewlineRule
// Note: Using Vitest (see package.json "test": "vitest" and src/vitest.config.*)
import { describe, expect, test } from 'vitest';
import { BaseRule, TrailingNewlineRule } from '../../rules/BaseRule';

describe('TrailingNewlineRule: properties', () => {
  test('has correct rule name', () => {
    const rule = new TrailingNewlineRule();
    expect(rule.name).toBe('trailing-newline');
  });

  test('is an instance of BaseRule', () => {
    const rule = new TrailingNewlineRule();
    expect(rule).toBeInstanceOf(BaseRule);
  });
});

describe('TrailingNewlineRule: happy paths', () => {
  test('adds newline when missing (simple)', () => {
    const rule = new TrailingNewlineRule();
    expect(rule.fix('Hello', 'test.txt')).toBe('Hello\n');
  });

  test('no change when trailing newline already present', () => {
    const rule = new TrailingNewlineRule();
    const content = 'Hello\n';
    const result = rule.fix(content, 'test.txt');
    // Value equality proves unchanged content
    expect(result).toBe('Hello\n');
  });

  test('multiline without final newline gets one added', () => {
    const rule = new TrailingNewlineRule();
    const content = 'Line 1\nLine 2\nLine 3';
    expect(rule.fix(content, 'file.md')).toBe('Line 1\nLine 2\nLine 3\n');
  });

  test('multiline with final newline remains unchanged', () => {
    const rule = new TrailingNewlineRule();
    const content = 'L1\nL2\n';
    expect(rule.fix(content, 'file.md')).toBe('L1\nL2\n');
  });

  test('idempotent when already fixed', () => {
    const rule = new TrailingNewlineRule();
    const once = rule.fix('abc', 'a.ts');
    const twice = rule.fix(once, 'a.ts');
    expect(once).toBe('abc\n');
    expect(twice).toBe('abc\n');
  });
});

describe('TrailingNewlineRule: edge cases', () => {
  test('empty string becomes a single newline', () => {
    const rule = new TrailingNewlineRule();
    expect(rule.fix('', 'empty.txt')).toBe('\n');
  });

  test('single newline remains a single newline', () => {
    const rule = new TrailingNewlineRule();
    expect(rule.fix('\n', 'n.txt')).toBe('\n');
  });
});
