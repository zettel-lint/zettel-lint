import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join, sep } from 'node:path';
import fixerCommand from '../../../zl-fix';

describe('path handling integration tests', () => {
  const testDir = join('test-output', 'path-handling');
  const inputDir = join(testDir, 'input');
  const outputDir = join(testDir, 'output');

  // Create test directories and sample files
  beforeEach(async () => {
    await fs.mkdir(inputDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });
    
    // Create a test file with some content
    await fs.writeFile(
      join(inputDir, 'test.md'),
      '# Test Note\n\nThis is a test note with a property: value',
      'utf8'
    );

    // Create a subdirectory with spaces
    const subDir = join(inputDir, 'My Notes');
    await fs.mkdir(subDir, { recursive: true });
    await fs.writeFile(
      join(subDir, 'note with spaces.md'),
      '# Test Note\n\nThis is another test note',
      'utf8'
    );
  });

  // Clean up test directories
  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test('handles nested directories with platform-specific separators', async () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', inputDir,
      '--output-dir', outputDir,
      '--rules', 'trailing-newline'
    ]);

    expect(parsed.opts().path).toBe(inputDir);
    expect(parsed.opts().outputDir).toBe(outputDir);

    // Verify the paths use correct platform-specific separators
    expect(inputDir.includes(sep)).toBe(true);
    expect(outputDir.includes(sep)).toBe(true);
  });

  test('preserves directory structure in output', async () => {
    const cmd = fixerCommand();
    
    await cmd.parseAsync([
      'node', 'zl',
      '--path', inputDir,
      '--output-dir', outputDir,
      '--rules', 'trailing-newline',
      '--verbose'
    ]);

    // Check that the directory structure is preserved
    const exists = await fs.access(join(outputDir, 'My Notes'))
      .then(() => true)
      .catch(() => false);
    
    expect(exists).toBe(true);
  });

  test('handles ignored directories with platform-specific paths', async () => {
    // Create a directory to ignore
    const ignoreDir = join(inputDir, 'ignored_folder');
    await fs.mkdir(ignoreDir, { recursive: true });
    await fs.writeFile(
      join(ignoreDir, 'ignored.md'),
      '# Ignored Note\n\nThis should not be processed\n',
      'utf8'
    );

    const cmd = fixerCommand();
    await cmd.parseAsync([
      'node', 'zl',
      '--path', inputDir,
      '--output-dir', outputDir,
      '--ignore-dirs', ignoreDir,
      '--rules', 'trailing-newline',
      '--verbose'
    ]);

    // Verify that ignored file was not processed
    const ignoredFileExists = await fs.access(join(outputDir, 'ignored_folder', 'ignored.md'))
      .then(() => true)
      .catch(() => false);
    
    expect(ignoredFileExists).toBe(false);
  });
});
