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

// Legacy programmatic options no longer suppress numeric tags.
test.each([
  ['default options', {}],
  ['camel-case legacy option', { ignoreNumericTags: true }],
  ['hyphenated legacy option', { 'ignore-numeric-tags': true }],
])('retains numeric inline and YAML tags with %s', (_name, options) => {
  const sut = new TagCollector();
  const content = '---\ntags: [123, "2026-plan", project]\n---\nBody #456 #7days #project';

  expect(sut.collector('note.md', content, options)).toEqual([
    '#456', '#7days', '#project', '#123', '#2026-plan', '#project',
  ]);
});

test('retains numeric tags from scalar frontmatter without keeping empty tags', () => {
  const sut = new TagCollector();

  expect(sut.collector('note.md', '---\ntags: "123  4work #"\n---\n', {
    ignoreNumericTags: true,
  })).toEqual(['#123', '#4work']);
});
