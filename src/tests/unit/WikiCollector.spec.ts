import { expect, test } from 'vitest';
import { WikiCollector } from '../../WikiCollector'

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
    expect(sut.collect("[[Wiki-Link]]").toString())
        .toBe("[[Wiki-Link]]");
  });