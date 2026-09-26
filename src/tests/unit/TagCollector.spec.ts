import { expect, test } from 'vitest';
import { TagCollector } from '../../collectors/TagCollector'

test('empty file has no tags', () => {
    var sut = new TagCollector();
    expect(sut.collect("")).toHaveLength(0);
  });

  test('extracts #tags at start of string or line', () => {
    var sut = new TagCollector();
    expect(sut.collect("#timestamp").toString())
        .toBe("#timestamp");
  });

  test('ignores titles', () => {
    var sut = new TagCollector();
    expect(sut.collect("# Title"))
        .toHaveLength(0);
  });

  test('ignores subtitles', () => {
    var sut = new TagCollector();
    expect(sut.collect("##Subtitle"))
        .toHaveLength(0);
  });

  test('supports numbers', () => {
    var sut = new TagCollector();
    expect(sut.collect("#12345678").toString())
        .toBe("#12345678");
  });

  test('supports embedded tags', () => {
    var sut = new TagCollector();
    expect(sut.collect("Sometimes a #tag is inside a sentence.").toString())
        .toBe("#tag");
  });

  test('supports nested tags', () => {
    var sut = new TagCollector();
    expect(sut.collect("Sometimes a #parent/child tag is nested.").toString())
        .toBe("#parent/child");
  });

  test('supports yaml tags', () => {
    var sut = new TagCollector();
    expect(sut.collect("---\ntags: yaml header\n---\nSome content goes here."))
        .toEqual(expect.arrayContaining(["#yaml", "#header"]));
  });

  test('supports yaml list', () => {
    var sut = new TagCollector();
    expect(sut.collect("---\ntags: [yaml, header, tags, last]\n---\nSome content goes here."))
      .toEqual(expect.arrayContaining(["#yaml", "#header", "#tags", "#last"]));
  }); 

  
  test('ignores empty yaml list', () => {
    var sut = new TagCollector();
    expect(sut.collect("---\ntags: []\n---\nSome content goes here."))
      .toEqual([]);
  }); 

  test('ignores square brackets', () => {
    var sut = new TagCollector();
    expect(sut.collect("Sometimes a #parent[child tag is #nested]."))
      .toEqual(["#parent", "#nested"]);
  });

  test('ignores tags that start with a number when ignoreNumericTags is true (Issue #902 build failure example)', () => {
    var sut = new TagCollector();
    expect(sut.collector("tasks.md", "Issues #852 and #853 in CI build failure #123", { ignoreNumericTags: true }))
      .toEqual([]);
  });

  test('keeps non-numeric tags while ignoring tags starting with a number when ignoreNumericTags is true', () => {
    var sut = new TagCollector();
    expect(sut.collector("tasks.md", "Issue #852 and valid #hashtag and #release", { ignoreNumericTags: true }))
      .toEqual(["#hashtag", "#release"]);
  });