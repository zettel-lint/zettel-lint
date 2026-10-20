import { expect, test } from 'vitest';
import { WikiCollector } from '../../collectors/WikiCollector'
import { fileWikiLinks } from '../../types'

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

  test('collects backlinks only from the last note for each ID in map order', () => {
    const sut = new WikiCollector();
    const files = [
      { ...new fileWikiLinks(), id: 'source', filename: 'old.md', matchData: { Links: ['[old-target]', '[shared]'] } },
      { ...new fileWikiLinks(), id: 'other', matchData: { Links: ['[shared]'] } },
      { ...new fileWikiLinks(), id: 'source', filename: 'new.md', matchData: { Links: ['[new-target]', '[shared]'] } },
      { ...new fileWikiLinks(), id: 'old-target', matchData: { Links: [] } },
      { ...new fileWikiLinks(), id: 'new-target', matchData: { Links: [] } },
      { ...new fileWikiLinks(), id: 'shared', matchData: { Links: [] } },
    ];

    const result = sut.extractAll(files);

    expect(result.get('source')).toHaveLength(1);
    expect(result.get('source')?.[0].filename).toBe('new.md');
    expect(result.get('old-target')?.[0].bag).toEqual([]);
    expect(result.get('new-target')?.[0].bag).toEqual(['source']);
    expect(result.get('shared')?.[0].bag).toEqual(['source', 'other']);
  });
