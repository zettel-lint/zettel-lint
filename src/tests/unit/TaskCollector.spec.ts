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

  test('sorts tasks by priority and then by due date', () => {
    const sut = new TaskCollector();
    (sut as unknown as { programArgs: { taskDisplay: string } }).programArgs = { taskDisplay: "by-priority" };
    const refs = [
      {
        id: 'doc1',
        filename: 'doc1.md',
        title: 'Doc 1',
        fullpath: '/doc1.md',
        data: [
          '[ ] Checklist without due date',
          '(B) Task B due:2026-05-01',
          '(A) Task A late due:2026-09-01',
          '(A) Task A early due:2026-01-01',
          '(A) Task A without due date',
          '[ ] Checklist with due date due:2026-02-01',
        ],
      },
    ];
    const output = (sut as unknown as { format: (refs: unknown[]) => string }).format(refs);
    const lines = output.trim().split('\n').filter((l: string) => l.trim().length > 0).map((l: string) => l.replace(/^\*\s*/, ''));
    expect(lines).toEqual([
      '(A) Task A early due:2026-01-01 +doc1 => [Doc 1][doc1]',
      '(A) Task A late due:2026-09-01 +doc1 => [Doc 1][doc1]',
      '(A) Task A without due date +doc1 => [Doc 1][doc1]',
      '(B) Task B due:2026-05-01 +doc1 => [Doc 1][doc1]',
      '[ ] Checklist with due date due:2026-02-01 +doc1 => [Doc 1][doc1]',
      '[ ] Checklist without due date +doc1 => [Doc 1][doc1]',
    ]);
  });
