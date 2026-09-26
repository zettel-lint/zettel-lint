import { expect, test } from 'vitest';
import { WikiCollector } from '../../collectors/WikiCollector'

test('empty file has no links', () => {
    const sut = new WikiCollector();
    expect(sut.collect("")).toHaveLength(0);
  });

  test('supports timestamp links', () => {
    const sut = new WikiCollector();
    expect(sut.collect("[20200101120060]").toString())
        .toBe("[20200101120060]");
  });

  test('ignores qualified links', () => {
    const sut = new WikiCollector();
    expect(sut.collect("[real-file](a.real.file.md)"))
        .toHaveLength(0);
  });
  
  test('ignores reference links', () => {
    const sut = new WikiCollector();
    expect(sut.collect("[title-text][see-reference-below]"))
        .toHaveLength(0);
  });

  test('supports wiki links', () => {
    const sut = new WikiCollector();
    expect(sut.collect("[[Wiki-Link]]\"").toString())
        .toBe("[[Wiki-Link]]");
  });

  test('rejects non-ASCII wiki links', () => {
    const sut = new WikiCollector();
    expect(sut.collect('[[Wïkï-Link]]')).toHaveLength(0);
  });