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

test('by-priority skips absent task data and keeps available tasks', () => {
  const sut = new TaskCollector();
  sut.collector('note.md', '', { taskDisplay: 'by-priority' });
  const output = sut.formatter([
    { id: '1', title: 'Empty', filename: 'empty.md', wikiname: '', fullpath: '', matchData: {} },
    { id: '2', title: 'Task', filename: 'task.md', wikiname: '', fullpath: '', matchData: { Tasks: ['(A) Do it'] } }
  ]);
  expect(output).toContain('(A) Do it');
});
