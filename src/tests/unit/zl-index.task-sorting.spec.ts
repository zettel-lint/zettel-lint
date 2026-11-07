import { expect, test } from 'vitest';
import { indexer } from '../../zl-index-core.js';
import { toFilePath, type FileAdapter } from '../../file-system.js';
import type { ZlIndexOptions } from '../../core-options.js';

test.each(['by-priority', 'by-file', 'none'] as const)(
  'index renders tasks in the expected order for %s', async (taskDisplay: ZlIndexOptions['taskDisplay']) => {
    const contents = new Map([
      ['notes/due:2020-01-01.md', '# Undated due:2019-01-01\n(A) Undated'],
      ['notes/late.md', '# Late\n(A) Alpha due:2026-09-01\n(B) Higher deadline due:2026-01-01'],
      ['notes/early.md', '# Early\n(A) Zulu due:2026-02-01'],
      ['template.mustache', '{{#Tasks}}{{{key}}}\n{{/Tasks}}'],
    ]);
    let output = '';
    const adapter: FileAdapter = {
      listFiles: async () => [...contents.keys()].filter(p => p.startsWith('notes/')).map(toFilePath),
      readFile: async path => contents.get(path)!,
      writeFile: async (_path, content) => { output = content; },
    };
    const options: ZlIndexOptions = {
      path: toFilePath('notes'), referenceFile: toFilePath('index.md'),
      templateFile: toFilePath('template.mustache'), createFile: toFilePath(''),
      taskDisplay, showOrphans: false, jsonDebugOutput: false,
      ignoreNumericTags: false, wiki: false, verbose: false,
    };

    await indexer(options, adapter);

    const encounterOrder = [
      '(A) Undated', '(A) Alpha due:2026-09-01',
      '(B) Higher deadline due:2026-01-01', '(A) Zulu due:2026-02-01',
    ];
    const expected = taskDisplay === 'none' ? [] : taskDisplay === 'by-file'
      ? encounterOrder : [encounterOrder[3], encounterOrder[1], encounterOrder[0], encounterOrder[2]];
    expect(output).toBe(expected.map(task => `${task}\n`).join(''));
  },
);
