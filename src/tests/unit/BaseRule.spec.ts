// Tests for BaseRule
// Note: Using Vitest (see package.json "test": "vitest" and src/vitest.config.*)
import { describe, expect, test } from 'vitest';
import { BaseRule } from '../../rules/BaseRule';

describe('BaseRule contract', () => {
  test('subclasses must provide name and fix', () => {
    class TestRule extends BaseRule {
      readonly name = 'test-rule';
      fix(content: string, _filePath: string): string { return content; }
    }
    const rule = new TestRule();
    expect(rule.name).toBe('test-rule');
    expect(typeof rule.fix).toBe('function');
    expect(rule.fix('x', 'file.txt')).toBe('x');
  });

  test('subclass can transform content', () => {
    class UpperRule extends BaseRule {
      readonly name = 'upper';
      fix(content: string, _filePath: string): string { return content.toUpperCase(); }
    }
    const rule = new UpperRule();
    expect(rule.fix('TeSt', 'a.md')).toBe('TEST');
  });
});
