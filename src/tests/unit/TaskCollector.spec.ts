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

  test('formatter handles by-file and by-priority display', () => {
    const sut = new TaskCollector();
    const refs = [
      {
        id: "task1",
        title: "Task Note 1",
        filename: "task1.md",
        fullpath: "task1.md",
        name: "Tasks",
        data: ["[ ] Task A", "[ ] Task B"],
        bag: [],
      },
      {
        id: "empty",
        title: "Empty Note",
        filename: "empty.md",
        fullpath: "empty.md",
        name: "Tasks",
        data: [],
        bag: [],
      },
      {
        id: "task2",
        title: "Task Note 2",
        filename: "task2.md",
        fullpath: "task2.md",
        name: "Tasks",
        data: ["(A) Urgent Task"],
        bag: [],
      },
    ];

    // Test "by-file"
    sut.collector("dummy.md", "", { taskDisplay: "by-file" });
    // @ts-ignore - access protected format
    const byFile = sut.format(refs);
    expect(byFile).toBe(
      "\n\n### Task Note 1 [task1.md](./task1.md)\n\n<details>\n\n* [ ] Task A\n* [ ] Task B\n\n</details>\n" +
      "\n\n### Task Note 2 [task2.md](./task2.md)\n\n<details>\n\n* (A) Urgent Task\n\n</details>"
    );

    // Test "by-priority"
    sut.collector("dummy.md", "", { taskDisplay: "by-priority" });
    // @ts-ignore - access protected format
    const byPriority = sut.format(refs);
    expect(byPriority).toContain("* (A) Urgent Task +task2 => [Task Note 2][task2]");
    expect(byPriority).toContain("* [ ] Task A +task1 => [Task Note 1][task1]");
    expect(byPriority).toContain("* [ ] Task B +task1 => [Task Note 1][task1]");

    // Test empty refs
    // @ts-ignore - access protected format
    expect(sut.format([])).toBe("");
  });
