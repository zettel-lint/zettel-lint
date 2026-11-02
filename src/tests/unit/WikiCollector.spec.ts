import { expect, test } from 'vitest';
import { WikiCollector } from '../../collectors/WikiCollector'

test('empty file has no links', () => {
    var sut = new WikiCollector();
    expect(sut.collect("")).toHaveLength(0);
  });

  test('supports timestamp links', () => {
    var sut = new WikiCollector();
    expect(sut.collect("[20200101120060]").toString())
        .toBe("[20200101120060]");
  });

  test('ignores qualified links', () => {
    var sut = new WikiCollector();
    expect(sut.collect("[real-file](a.real.file.md)"))
        .toHaveLength(0);
  });
  
  test('ignores reference links', () => {
    var sut = new WikiCollector();
    expect(sut.collect("[title-text][see-reference-below]"))
        .toHaveLength(0);
  });

  test('supports wiki links', () => {
    var sut = new WikiCollector();
    expect(sut.collect("[[Wiki-Link]]\"").toString())
        .toBe("[[Wiki-Link]]");
  });

  test('rejects non-ASCII wiki links', () => {
    var sut = new WikiCollector();
    expect(sut.collect('[[Wïkï-Link]]')).toHaveLength(0);
  });

  test('invertDictionary safely handles prototype property names without crashing or pollution', async () => {
    const { invertDictionary } = await import('../../types');
    const references = [
      {
        id: 'note-1',
        title: 'Note 1',
        filename: 'note1.md',
        fullpath: '/notes/note1.md',
        name: 'Tags',
        data: ['toString', 'valueOf', '__proto__', 'constructor', 'prototype', 'normal-tag'],
        bag: [],
      },
    ];

    expect(() => invertDictionary(references)).not.toThrow();
    const result = invertDictionary(references);

    expect(result.toString).toEqual(['[Note 1][note-1]']);
    expect(result.valueOf).toEqual(['[Note 1][note-1]']);
    expect(result['normal-tag']).toEqual(['[Note 1][note-1]']);
    expect(result.__proto__).toBeUndefined();
    expect(result.constructor).toBeUndefined();
    expect(result.prototype).toBeUndefined();
  });