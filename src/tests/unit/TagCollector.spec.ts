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

  test('filters tags that start with a number when ignoreNumericTags is true', () => {
    var sut = new TagCollector();
    expect(sut.collector("file.md", "Content with #12345678 and #tag1 and #2026-tag and #tag-2026", { ignoreNumericTags: true }))
      .toEqual(["#tag1", "#tag-2026"]);
  });

  test('includes numeric tags when ignoreNumericTags is false or not set', () => {
    var sut = new TagCollector();
    expect(sut.collector("file.md", "Content with #12345678 and #tag1", { ignoreNumericTags: false }))
      .toEqual(["#12345678", "#tag1"]);
  });