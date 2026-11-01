import { expect, test } from 'vitest';
import { TaskCollector } from '../../collectors/TaskCollector'

test('empty file has no tasks', () => {
    var sut = new TaskCollector();
    expect(sut.collect("")).toHaveLength(0);
  });

  test('ignores non tasks', () => {
    var sut = new TaskCollector();
    expect(sut.collect("A paragraph of text.\n\n* A list item\n\n## A Header").toString())
      .toHaveLength(0);
  });

  test('supports priority tasks', () => {
    var sut = new TaskCollector();
    expect(sut.collect("(A) First Task").toString()).toBe("(A) First Task");
  });

  test('ignores completed priority tasks', () => {
    var sut = new TaskCollector();
    expect(sut.collect("(-) First Task")).toHaveLength(0);
  });

  test('supports priority tasks in lists', () => {
    var sut = new TaskCollector();
    expect(sut.collect("* (A) First Task").toString()).toBe("(A) First Task");
    expect(sut.collect("- (A) First Task").toString()).toBe("(A) First Task");
  });

  test('supports checklist tasks', () => {
    var sut = new TaskCollector();
    expect(sut.collect("[ ] First Task").toString()).toBe("[ ] First Task");
    expect(sut.collect("* [ ] First Task").toString()).toBe("[ ] First Task");
    expect(sut.collect("- [ ] First Task").toString()).toBe("[ ] First Task");
  });

  test('ignores completed checklist tasks', () => {
    var sut = new TaskCollector();
    expect(sut.collect("[X] First Task").toString()).toHaveLength(0);
    expect(sut.collect("* [X] First Task").toString()).toHaveLength(0);
    expect(sut.collect("- [X] First Task").toString()).toHaveLength(0);
  });

  test('formats tasks grouped by filename', () => {
    const sut = new TaskCollector();
    const formatMethod = (sut as unknown as { formatGroupByFilename: (refs: unknown[]) => string }).formatGroupByFilename.bind(sut);

    // Empty references
    expect(formatMethod([])).toBe("");

    // References with no task data
    const noTasks = [
      { id: "1", title: "Note 1", filename: "note1.md", fullpath: "", name: "Tasks", data: [], bag: [] },
    ];
    expect(formatMethod(noTasks)).toBe("");

    // Single note with tasks
    const singleNote = [
      { id: "1", title: "Note 1", filename: "note1.md", fullpath: "", name: "Tasks", data: ["[ ] Task A", "[ ] Task B"], bag: [] },
    ];
    expect(formatMethod(singleNote)).toBe(
      "\n\n### Note 1 [note1.md](./note1.md)\n\n<details>\n\n* [ ] Task A\n* [ ] Task B\n\n</details>"
    );

    // Multiple notes, one without tasks
    const multiNotes = [
      { id: "1", title: "Note 1", filename: "note1.md", fullpath: "", name: "Tasks", data: ["[ ] Task 1"], bag: [] },
      { id: "2", title: "Note 2", filename: "note2.md", fullpath: "", name: "Tasks", data: [], bag: [] },
      { id: "3", title: "Note 3", filename: "note3.md", fullpath: "", name: "Tasks", data: ["(A) Urgent"], bag: [] },
    ];
    expect(formatMethod(multiNotes)).toBe(
      "\n\n### Note 1 [note1.md](./note1.md)\n\n<details>\n\n* [ ] Task 1\n\n</details>\n" +
      "\n\n### Note 3 [note3.md](./note3.md)\n\n<details>\n\n* (A) Urgent\n\n</details>"
    );
  });

  test('formats tasks sorted by priority', () => {
    const sut = new TaskCollector();
    const formatMethod = (sut as unknown as { formatSortByPriority: (refs: unknown[]) => string }).formatSortByPriority.bind(sut);

    // Empty references
    expect(formatMethod([])).toBe("");

    // Multiple notes with prioritized tasks
    const multiNotes = [
      { id: "1", title: "Note 1", filename: "note1.md", fullpath: "", name: "Tasks", data: ["(B) Low pri"], bag: [] },
      { id: "2", title: "Note 2", filename: "note2.md", fullpath: "", name: "Tasks", data: ["(A) High pri"], bag: [] },
    ];
    expect(formatMethod(multiNotes)).toBe(
      "\n* (A) High pri +note2 => [Note 2][2]\n" +
      "\n* (B) Low pri +note1 => [Note 1][1]"
    );
  });
