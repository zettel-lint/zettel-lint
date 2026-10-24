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

  test('formatter handles built-in prototype methods and dangerous keys safely without throwing', () => {
    const sut = new TagCollector();
    const mockRef = {
      id: "note1",
      title: "Note 1",
      filename: "note1.md",
      fullpath: "/path/note1.md",
      name: "Tags",
      data: ["toString", "valueOf", "hasOwnProperty", "__proto__", "constructor", "prototype"],
      bag: []
    };
    expect(() => sut.formatter([{
      id: "note1",
      title: "Note 1",
      filename: "note1.md",
      wikiname: "note1",
      fullpath: "/path/note1.md",
      matchData: { Tags: mockRef.data }
    }])).not.toThrow();

    const output = sut.formatter([{
      id: "note1",
      title: "Note 1",
      filename: "note1.md",
      wikiname: "note1",
      fullpath: "/path/note1.md",
      matchData: { Tags: mockRef.data }
    }]);

    expect(output).toContain(
      "* __proto__ : [Note 1][note1]\n" +
      "* constructor : [Note 1][note1]\n" +
      "* hasOwnProperty : [Note 1][note1]\n" +
      "* prototype : [Note 1][note1]\n" +
      "* toString : [Note 1][note1]\n" +
      "* valueOf : [Note 1][note1]\n"
    );
  });
