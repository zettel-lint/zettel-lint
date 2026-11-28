import { expect, test } from 'vitest';
import { TagCollector } from '../../collectors/TagCollector'
import type { YamlHeaders } from '../../collectors/Collector.js';

class InstrumentedTagCollector extends TagCollector {
  collectYamlCallCount = 0;

  protected override collectYaml(content: string): YamlHeaders {
    this.collectYamlCallCount++;
    return super.collectYaml(content);
  }
}

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

  test('handles frontmatter without tags property correctly', () => {
    var sut = new InstrumentedTagCollector();
    expect(sut.collect("---\ntitle: No Tags Here\ndate: 2026-04-08\n---\nBody with #inline tag."))
      .toEqual(["#inline"]);
    expect(sut.collectYamlCallCount).toBe(0);
  });

  test('supports CRLF frontmatter tags and frontmatter without trailing newline', () => {
    var sut = new InstrumentedTagCollector();
    expect(sut.collect("---\r\ntags: [crlf, windows]\r\n---\r\nBody text"))
      .toEqual(expect.arrayContaining(["#crlf", "#windows"]));
    expect(sut.collect("---\ntags: [notrailing]\n---"))
      .toEqual(["#notrailing"]);
    expect(sut.collect("---\r\ntitle: Windows No Tags\r\n---\r\nBody with #crlftag"))
      .toEqual(["#crlftag"]);
    expect(sut.collectYamlCallCount).toBe(2);
  });

  test('skips frontmatter when tags is only mentioned in a value', () => {
    const sut = new InstrumentedTagCollector();
    expect(sut.collect("---\ndescription: Discuss hashtags\nstatus: active\n---\nBody"))
      .toEqual([]);
    expect(sut.collectYamlCallCount).toBe(0);
  });

  test.each([
    ["plain", "tags"],
    ["double-quoted", '"tags"'],
    ["single-quoted", "'tags'"],
    ["unicode-escaped", '"\\u0074ags"'],
  ])('recognises %s YAML tag keys', (_description: string, key: string) => {
    const content = ["---", `${key}: [example]`, "---"].join("\n");
    expect(new TagCollector().collect(content)).toEqual(["#example"]);
  });

  test.each(["\n", "\r\n"])('does not close frontmatter inside a value (%j)', (newline: string) => {
    const content = ["---", "title: prefix---", "tags: [after]", "---", "Body"].join(newline);
    expect(new TagCollector().collect(content)).toEqual(["#after"]);
  });

  test.each(["\n", "\r\n"])('propagates malformed YAML without tags (%j)', (newline: string) => {
    const content = ["---", "title: [unclosed", "---"].join(newline);
    expect(() => new TagCollector().collect(content)).toThrow();
  });

  test.each(["\n", "\r\n"])('recognises escaped YAML tag keys (%j)', (newline: string) => {
    const content = ["---", '"ta\\u0067s": [escaped]', "---"].join(newline);
    expect(new TagCollector().collect(content)).toEqual(["#escaped"]);
  });

  test('ignores unclosed malformed frontmatter', () => {
    expect(new TagCollector().collect("---\ntitle: [unclosed")).toEqual([]);
  });

  test.each([
    ["LF opening and CRLF closing", "---\ntags: [mixed]\r\n---\r\nBody"],
    ["CRLF opening and LF closing", "---\r\ntags: [mixed]\n---\nBody"],
    ["LF opening and CRLF before EOF delimiter", "---\ntags: [mixed]\r\n---"],
    ["CRLF opening and LF before EOF delimiter", "---\r\ntags: [mixed]\n---"],
  ])('supports mixed frontmatter line endings: %s', (_description: string, content: string) => {
    expect(new TagCollector().collect(content)).toEqual(["#mixed"]);
  });
