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

test('uses project tag boundaries and preserves complete tokens', () => {
  const sut = new WikiCollector();
  expect(sut.collector("todo.txt", "First task\n+alpha Follow up +work/home +alpha-beta_2", {}))
    .toEqual(["+alpha", "+work/home", "+alpha-beta_2"]);
  expect(sut.collect("word+embedded (+parenthesized) [[Wiki-Link]] [20200101120060]"))
    .toEqual(["[[Wiki-Link]]", "[20200101120060]"]);
});
