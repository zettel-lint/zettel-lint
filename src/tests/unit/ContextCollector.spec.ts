import { describe, expect, it } from 'vitest';
import { ContextCollector } from '../../collectors/ContextCollector.js';
import { formatData } from '../../types.js';

class TestContextCollector extends ContextCollector {
  public formatTest(references: formatData[]): string {
    return this.format(references);
  }
}

describe('ContextCollector.format', () => {
  it('formats context references into a bullet list', () => {
    const collector = new TestContextCollector();
    const ref1 = new formatData();
    ref1.title = 'Task 1';
    ref1.id = '1';
    ref1.data = ['@work', '@urgent'];

    const ref2 = new formatData();
    ref2.title = 'Task 2';
    ref2.id = '2';
    ref2.data = ['@work', '@home'];

    const output = collector.formatTest([ref1, ref2]);
    expect(output).toContain('* @work : [Task 1][1],[Task 2][2]\n');
    expect(output).toContain('* @urgent : [Task 1][1]\n');
    expect(output).toContain('* @home : [Task 2][2]\n');
  });

  it('handles empty references array', () => {
    const collector = new TestContextCollector();
    const output = collector.formatTest([]);
    expect(output).toBe('');
  });
});
