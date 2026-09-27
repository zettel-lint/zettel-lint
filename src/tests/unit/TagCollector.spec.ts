import { expect, test } from 'vitest';
import { TagCollector } from '../../collectors/TagCollector'

test('empty file has no tags', () => {
    const sut = new TagCollector();
    expect(sut.collect("")).toHaveLength(0);
  });

  test('extracts #tags at start of string or line', () => {
    const sut = new TagCollector();
    expect(sut.collect("#timestamp").toString())
        .toBe("#timestamp");
  });

  test('ignores titles', () => {
    const sut = new TagCollector();
    expect(sut.collect("# Title"))
        .toHaveLength(0);
  });

  test('ignores subtitles', () => {
    const sut = new TagCollector();
    expect(sut.collect("##Subtitle"))
        .toHaveLength(0);
  });

  test('supports numbers', () => {
    const sut = new TagCollector();
    expect(sut.collect("#12345678").toString())
        .toBe("#12345678");
  });

  test('supports embedded tags', () => {
    const sut = new TagCollector();
    expect(sut.collect("Sometimes a #tag is inside a sentence.").toString())
        .toBe("#tag");
  });

  test('supports nested tags', () => {
    const sut = new TagCollector();
    expect(sut.collect("Sometimes a #parent/child tag is nested.").toString())
        .toBe("#parent/child");
  });

  test('supports yaml tags', () => {
    const sut = new TagCollector();
    expect(sut.collect("---\ntags: yaml header\n---\nSome content goes here."))
        .toEqual(expect.arrayContaining(["#yaml", "#header"]));
  });

  test('supports yaml list', () => {
    const sut = new TagCollector();
    expect(sut.collect("---\ntags: [yaml, header, tags, last]\n---\nSome content goes here."))
      .toEqual(expect.arrayContaining(["#yaml", "#header", "#tags", "#last"]));
  }); 

  
  test('ignores empty yaml list', () => {
    const sut = new TagCollector();
    expect(sut.collect("---\ntags: []\n---\nSome content goes here."))
      .toEqual([]);
  }); 

  test('ignores square brackets', () => {
    const sut = new TagCollector();
    expect(sut.collect("Sometimes a #parent[child tag is #nested]."))
      .toEqual(["#parent", "#nested"]);
  });