import { describe, it, expect } from 'vitest';
import { InlinePropertiesToFrontmatter } from '../../rules/InlinePropertiesToFrontmatterRule.js';

describe('InlinePropertiesToFrontmatter in move mode', () => {
  const rule = new InlinePropertiesToFrontmatter(true);

  it('should format inline properties into YAML frontmatter', () => {
    const input = `# My Note
Some content with [tag:: value1] and [another-tag:: value2].
More content here.`;

    const expected = `---
tag:
  - value1
another-tag:
  - value2
---
# My Note
Some content with  and .
More content here.
`;

    expect(rule.fix(input, 'test.md')).toBe(expected);
  });

  it('should handle existing YAML frontmatter and merge with inline properties', () => {
    const input = `---
existing: value
tag: oldValue
---
# My Note
Some content with [tag:: newValue] here.`;

    const expected = `---
existing:
  - value
tag:
  - oldValue
  - newValue
---
# My Note
Some content with  here.
`;

    expect(rule.fix(input, 'test.md')).toBe(expected);
  });

  it('should handle multiple values for the same property', () => {
    const input = `# My Note
[tags:: tag1, tag2] and [tags:: tag3] here.`;

    const expected = `---
tags:
  - tag1
  - tag2
  - tag3
---
# My Note
 and  here.
`;

    expect(rule.fix(input, 'test.md')).toBe(expected);
  });

  it('should return content unchanged if no properties found', () => {
    const input = '# Just a regular note\nWith no properties.';
    expect(rule.fix(input, 'test.md')).toBe(input);
  });

  it('should handle empty or invalid properties gracefully', () => {
    const input = `---
empty:
invalid:: value
---
# Note
[empty::]`;

    expect(rule.fix(input, 'test.md')).toBe(input);
  });
});

describe('InlinePropertiesToFrontmatter in copy mode', () => {
  const rule = new InlinePropertiesToFrontmatter(false);

  it('should format inline properties into YAML frontmatter', () => {
    const input = `# My Note
Some content with [tag:: value1] and [another-tag:: value2].
More content here.`;

    const expected = `---
tag:
  - value1
another-tag:
  - value2
---
# My Note
Some content with [tag:: value1] and [another-tag:: value2].
More content here.
`;

    expect(rule.fix(input, 'test.md')).toBe(expected);
  });

  it('should handle existing YAML frontmatter and merge with inline properties', () => {
    const input = `---
existing: value
tag: oldValue
---
# My Note
Some content with [tag:: newValue] here.`;

    const expected = `---
existing:
  - value
tag:
  - oldValue
  - newValue
---
# My Note
Some content with [tag:: newValue] here.
`;

    expect(rule.fix(input, 'test.md')).toBe(expected);
  });

  it('should handle multiple values for the same property', () => {
    const input = `# My Note
[tags:: tag1, tag2] and [tags:: tag3] here.`;

    const expected = `---
tags:
  - tag1
  - tag2
  - tag3
---
# My Note
[tags:: tag1, tag2] and [tags:: tag3] here.
`;

    expect(rule.fix(input, 'test.md')).toBe(expected);
  });

  it('should only copy properties that match the pattern if specified', () => {
    const ruleWithPattern = new InlinePropertiesToFrontmatter(false, [/^tag$/, /^author$/]);
    const input = `# My Note
Some content with [tag:: value1], [another-tag:: value2], and [tag-extra:: value3].`;

    const expected = `---
tag:
  - value1
---
# My Note
Some content with [tag:: value1], [another-tag:: value2], and [tag-extra:: value3].
`;

    expect(ruleWithPattern.fix(input, 'test.md')).toBe(expected);
  });

  it('should return content unchanged if no properties found', () => {
    const input = '# Just a regular note\nWith no properties.';
    expect(rule.fix(input, 'test.md')).toBe(input);
  });

  it('should handle empty or invalid properties gracefully', () => {
    const input = `---
empty:
invalid:: value
---
# Note
[empty::]`;

    expect(rule.fix(input, 'test.md')).toBe(input);
  });
});
