import { execa } from 'execa';
import { promises as fs } from 'fs';
import path from 'path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import importerCommand from '../../../zl-import';

const root = path.resolve(__dirname, '../../../..');
const inputsDir = path.join(__dirname, 'inputs');
const outputsDir = path.join(__dirname, 'outputs');
const expectedDir = path.join(__dirname, 'expected');

async function cleanOutputs() {
  try {
    await fs.rm(outputsDir, { recursive: true, force: true });
  } catch {}
  await fs.mkdir(outputsDir, { recursive: true });
}

async function getFilesRecursive(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(entry => {
    const res = path.resolve(dir, entry.name);
    return entry.isDirectory() ? getFilesRecursive(res) : res;
  }));
  return Array.prototype.concat(...files);
}

describe('zl-import trello system test', () => {
  beforeAll(async () => {
    await cleanOutputs();
  });

  it('should generate output files matching expected', async () => {
    // Run zl-import for trello source
    const cmd = await importerCommand().parseAsync([
      'zl', 'import',
      '--source', 'trello',
      '--path', path.join(inputsDir, '*.json'),
      '--output-folder', outputsDir + '/',
      '--verbose'
    ]);

    // Compare outputs to expected
    const expectedFiles = await getFilesRecursive(expectedDir);
    for (const expectedFile of expectedFiles) {
      const rel = path.relative(expectedDir, expectedFile);
      const outputFile = path.join(outputsDir, rel);
      const [expectedContent, outputContent] = await Promise.all([
        fs.readFile(expectedFile, 'utf8'),
        fs.readFile(outputFile, 'utf8')
      ]);
      expect(outputContent).toBe(expectedContent);
    }
  });

  afterAll(async () => {
    // Optionally clean up outputs
    // await cleanOutputs();
  });
});
