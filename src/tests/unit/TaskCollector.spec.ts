import { expect, test } from 'vitest';
import { TaskCollector } from '../../collectors/TaskCollector'

test('empty file has no tasks', () => {
    const sut = new TaskCollector();
    expect(sut.collect("")).toHaveLength(0);
  });

  test('ignores non tasks', () => {
    const sut = new TaskCollector();
    expect(sut.collect("A paragraph of text.\n\n* A list item\n\n## A Header").toString())
      .toHaveLength(0);
  });

  test('supports priority tasks', () => {
    const sut = new TaskCollector();
    expect(sut.collect("(A) First Task").toString()).toBe("(A) First Task");
  });

  test('ignores completed priority tasks', () => {
    const sut = new TaskCollector();
    expect(sut.collect("(-) First Task")).toHaveLength(0);
  });

  test('supports priority tasks in lists', () => {
    const sut = new TaskCollector();
    expect(sut.collect("* (A) First Task").toString()).toBe("(A) First Task");
    expect(sut.collect("- (A) First Task").toString()).toBe("(A) First Task");
  });

  test('supports checklist tasks', () => {
    const sut = new TaskCollector();
    expect(sut.collect("[ ] First Task").toString()).toBe("[ ] First Task");
    expect(sut.collect("* [ ] First Task").toString()).toBe("[ ] First Task");
    expect(sut.collect("- [ ] First Task").toString()).toBe("[ ] First Task");
  });

  test('ignores completed checklist tasks', () => {
    const sut = new TaskCollector();
    expect(sut.collect("[X] First Task").toString()).toHaveLength(0);
    expect(sut.collect("* [X] First Task").toString()).toHaveLength(0);
    expect(sut.collect("- [X] First Task").toString()).toHaveLength(0);
  });
