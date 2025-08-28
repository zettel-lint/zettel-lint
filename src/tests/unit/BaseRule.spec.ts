// Tests for BaseRule and TrailingNewlineRule
// Note: Using Vitest (see package.json "test": "vitest" and src/vitest.config.*)
import { describe, expect, test } from 'vitest';

// Reproduce the diff's classes inline to focus tests on their behavior.
// If these classes later move to a source module, switch these to imports.
abstract class BaseRule {
  abstract readonly name: string;
  abstract fix(content: string, filePath: string): string;
}

class TrailingNewlineRule extends BaseRule {
  readonly name = "trailing-newline";

  fix(content: string, filePath: string): string {
    if (!content.endsWith("\n")) {
      return content + "\n";
    }
    return content;
  }
}

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

  test('does not add more when content already has multiple trailing newlines', () => {
    const rule = new TrailingNewlineRule();
    const content = 'Hello\n\n';
    expect(rule.fix(content, 'x.txt')).toBe('Hello\n\n');
  });

  test('preserves whitespace-only content, adding exactly one newline if missing', () => {
    const rule = new TrailingNewlineRule();
    expect(rule.fix('   ', 'ws.txt')).toBe('   \n');
    expect(rule.fix('\t  \t', 'ws.txt')).toBe('\t  \t\n');
  });

  test('preserves Unicode and emoji while adding newline', () => {
    const rule = new TrailingNewlineRule();
    expect(rule.fix('你好世界', 'u.txt')).toBe('你好世界\n');
    expect(rule.fix('Hello 👋 World 🌍', 'u.txt')).toBe('Hello 👋 World 🌍\n');
  });

  test('preserves null bytes inside content and adds newline', () => {
    const rule = new TrailingNewlineRule();
    expect(rule.fix('A\0B', 'bin.dat')).toBe('A\0B\n');
  });
});

describe('TrailingNewlineRule: line ending nuances', () => {
  test('content with CRLF lines but no final newline gets LF appended', () => {
    const rule = new TrailingNewlineRule();
    expect(rule.fix('L1\r\nL2', 'w.txt')).toBe('L1\r\nL2\n');
  });

  test('content ending with CRLF already satisfies trailing \\n', () => {
    const rule = new TrailingNewlineRule();
    const content = 'L1\r\nL2\r\n';
    expect(rule.fix(content, 'w.txt')).toBe('L1\r\nL2\r\n');
  });
});

describe('TrailingNewlineRule: filePath parameter (ignored by rule)', () => {
  test('handles absolute paths', () => {
    const rule = new TrailingNewlineRule();
    expect(rule.fix('x', '/usr/local/file.txt')).toBe('x\n');
  });

  test('handles relative and Windows-style paths', () => {
    const rule = new TrailingNewlineRule();
    expect(rule.fix('x', '../file.txt')).toBe('x\n');
    expect(rule.fix('y', 'C:\\Users\\me\\f.txt')).toBe('y\n');
  });

  test('handles empty path', () => {
    const rule = new TrailingNewlineRule();
    expect(rule.fix('z', '')).toBe('z\n');
  });
});

describe('TrailingNewlineRule: invalid inputs', () => {
  test('throws for undefined content', () => {
    const rule = new TrailingNewlineRule();
    // @ts-expect-error runtime invalid
    expect(() => rule.fix(undefined, 'x.txt')).toThrow(TypeError);
  });

  test('throws for null content', () => {
    const rule = new TrailingNewlineRule();
    // @ts-expect-error runtime invalid
    expect(() => rule.fix(null, 'x.txt')).toThrow(TypeError);
  });

  test('throws for non-string content (number)', () => {
    const rule = new TrailingNewlineRule();
    // @ts-expect-error runtime invalid
    expect(() => rule.fix(123, 'x.txt')).toThrow(TypeError);
  });
});