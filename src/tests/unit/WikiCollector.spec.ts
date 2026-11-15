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

  test('formats references correctly with links and backlinks', () => {
    const sut = new WikiCollector();
    const formatMethod = (sut as unknown as { format: (refs: unknown[]) => string }).format.bind(sut);

    expect(formatMethod([])).toBe("");

    const singleNoteNoLinks = [
      { id: "1", title: "Note 1", filename: "note1.md", fullpath: "", name: "Links", data: [], bag: [] },
    ];
    expect(formatMethod(singleNoteNoLinks)).toBe(
      "* [Note 1][1] = `note1.md`:\n  * No links\n  * No backlinks"
    );

    const multiNotesWithLinks = [
      { id: "1", title: "Note 1", filename: "note1.md", fullpath: "", name: "Links", data: ["[2]"], bag: [] },
      { id: "2", title: "Note 2", filename: "note2.md", fullpath: "", name: "Links", data: ["[1]"], bag: [] },
    ];
    expect(formatMethod(multiNotesWithLinks)).toBe(
      "* [Note 1][1] = `note1.md`:\n  * [2]\n  * [Note 2][2]\n" +
      "* [Note 2][2] = `note2.md`:\n  * [1]\n  * [Note 1][1]"
    );
  });