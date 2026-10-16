import { afterEach, expect, test, vi } from 'vitest';
import { promises as fs } from 'fs';
import { glob } from 'glob';
import indexerCommand from '../../zl-index';

vi.mock('glob', () => ({ glob: vi.fn() }));

afterEach(() => {
  vi.restoreAllMocks();
});

test.each([0, 3, 35])('indexes %i files with bounded reads and preserves discovery order', async (count: number) => {
  const files = Array.from({ length: count }, (_, i) => `/notes/note-${i}.md`);
  vi.mocked(glob).mockResolvedValue(files);
  const pending: Array<() => void> = [];
  const completed: string[] = [];
  vi.spyOn(fs, 'readFile').mockImplementation((filename: Parameters<typeof fs.readFile>[0]) => {
    if (filename === '/template.mustache') {
      return Promise.resolve('{{#notes}}{{filename}}\n{{/notes}}');
    }
    return new Promise<string>((resolve) => {
      pending.push(() => {
        completed.push(String(filename));
        resolve('# Note');
      });
    });
  });
  vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
  const writeFile = vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined);

  const indexing = indexerCommand().parseAsync([
    'node', 'zl', '--path', '/notes', '--reference-file', '/references.md',
    '--template-file', '/template.mustache',
  ]);

  for (let offset = 0; offset < count; offset += 16) {
    const batchEnd = Math.min(offset + 16, count);
    await vi.waitFor(() => expect(pending).toHaveLength(batchEnd));
    expect(writeFile).not.toHaveBeenCalled();
    // Complete each batch in reverse order to exercise stable output ordering.
    for (let i = batchEnd - 1; i >= offset; i--) pending[i]();
  }
  await indexing;

  expect(completed).toHaveLength(count);
  expect(new Set(completed).size).toBe(count);
  expect(writeFile).toHaveBeenCalledExactlyOnceWith(
    '/references.md', files.map(file => `${file.split('/').pop()}\n`).join(''),
  );
});
