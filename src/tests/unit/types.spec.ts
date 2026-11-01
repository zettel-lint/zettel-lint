import { describe, expect, it } from 'vitest';
import { formatData, invertDictionary } from '../../types.js';

describe('invertDictionary security tests', () => {
  it('handles built-in Object.prototype methods as keys without crashing', () => {
    const item: formatData = {
      id: 'note-1',
      title: 'Note 1',
      filename: 'note1.md',
      fullpath: '/notes/note1.md',
      name: 'Tags',
      data: ['toString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf'],
      bag: [],
    };

    const result = invertDictionary([item]);
    expect(result.toString).toEqual(['[Note 1][note-1]']);
    expect(result.valueOf).toEqual(['[Note 1][note-1]']);
    expect(result.hasOwnProperty).toEqual(['[Note 1][note-1]']);
    expect(result.isPrototypeOf).toEqual(['[Note 1][note-1]']);
  });

  it('ignores dangerous prototype keys to prevent prototype pollution', () => {
    const item: formatData = {
      id: 'note-evil',
      title: 'Evil Note',
      filename: 'evil.md',
      fullpath: '/notes/evil.md',
      name: 'Tags',
      data: ['__proto__', 'constructor', 'prototype'],
      bag: [],
    };

    const result = invertDictionary([item]);
    expect(result.__proto__).toBeUndefined();
    expect(result.constructor).toBeUndefined();
    expect(result.prototype).toBeUndefined();
    expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
  });
});
