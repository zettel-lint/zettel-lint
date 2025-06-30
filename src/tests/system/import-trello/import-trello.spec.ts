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
    // Run zl-import for trello source using the CLI command as defined in project.json targets
    // Use npm run-script zl -- import --source trello ...
    await execa('npm', [
      'run-script',
      'zl',
      '--',
      'import',
      '--source', 'trello',
      '--path', path.join(inputsDir, '*.json'),
      '--output-folder', outputsDir,
      '--verbose',
      '--json-debug-output'
    ],{
      cwd: root,
      stdio: 'inherit'
    });

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

    // Check that no unexpected files were created, ignoring .gitignore and .DS_Store
    const outputFiles = await getFilesRecursive(outputsDir);
    const expectedRelFiles = expectedFiles.map(f => path.relative(expectedDir, f));
    const outputRelFiles = outputFiles.map(f => path.relative(outputsDir, f));
    const unexpectedFiles = outputRelFiles.filter(rel =>
      !expectedRelFiles.includes(rel) &&
      !rel.startsWith('.') &&
      !rel.startsWith('..') &&
      !rel.includes('.gitignore') &&
      !rel.includes('.DS_Store')
    );
    expect(unexpectedFiles.length).toBe(0);
  });

  afterAll(async () => {
    // Optionally clean up outputs
    // await cleanOutputs();
  });
});
