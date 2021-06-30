import { TagCollector } from '../../TagCollector'

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
    expect(sut.collect("##Subtitle"))
        .toHaveLength(0);
  });
  test('supports numbers', () => {
    var sut = new TagCollector();
    expect(sut.collect("#12345678"))
        .toHaveLength(0);
  });

  test('supports embedded tags', () => {
    var sut = new TagCollector();
    expect(sut.collect("Sometimes a #tag is inside a sentence.").toString())
        .toBe("#tag");
  });

  test('supports yaml tags', () => {
    var sut = new TagCollector();
    expect(sut.collect("---\ntags: yaml header\n---\nSome content goes here."))
        .toEqual(expect.arrayContaining(["#yaml", "#header"]));
  });

  test('supports yaml list', () => {
    var sut = new TagCollector();
    expect(sut.collect("---\ntags: [yaml, header]\n---\nSome content goes here."))
      .toEqual(expect.arrayContaining(["#yaml", "#header"]));
  }); 