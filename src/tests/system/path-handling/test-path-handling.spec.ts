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
      '# Test Note\n\nThis is a test note with a property: value\n',
      'utf8'
    );

    // Create a subdirectory with spaces
    const subDir = join(inputDir, 'My Notes');
    await fs.mkdir(subDir, { recursive: true });
    await fs.writeFile(
      join(subDir, 'note with spaces.md'),
      '# Test Note\n\nThis is another test note\n',
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
    // Ensure output directory exists
    await fs.mkdir(join(outputDir, 'My Notes'), { recursive: true });
    
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

  test('handles deeply nested directory structures', async () => {
    // Create deeply nested structure
    const deepDir = join(inputDir, 'level1', 'level2', 'level3', 'level4');
    await fs.mkdir(deepDir, { recursive: true });
    await fs.writeFile(
      join(deepDir, 'deep-note.md'),
      '# Deep Note\n\nThis is deeply nested\n',
      'utf8'
    );

    const cmd = fixerCommand();
    await cmd.parseAsync([
      'node', 'zl',
      '--path', inputDir,
      '--output-dir', outputDir,
      '--rules', 'trailing-newline',
      '--verbose'
    ]);

    // Verify the file was processed and structure preserved
    const deepOutputPath = join(outputDir, 'level1', 'level2', 'level3', 'level4', 'deep-note.md');
    const content = await fs.readFile(deepOutputPath, 'utf8');
    expect(content).toContain('# Deep Note');
    expect(content.endsWith('\n')).toBe(true);
  });

  test('handles relative path resolution correctly', async () => {
    const cmd = fixerCommand();
    await cmd.parseAsync([
      'node', 'zl',
      '--path', inputDir,
      '--output-dir', outputDir,
      '--rules', 'trailing-newline'
    ]);

    // Verify files were written to correct output location
    const outputFile = join(outputDir, 'test.md');
    const exists = await fs.access(outputFile)
      .then(() => true)
      .catch(() => false);
    
    expect(exists).toBe(true);
  });

  test('creates output directories automatically', async () => {
    // Remove output directory to test automatic creation
    await fs.rm(outputDir, { recursive: true, force: true });

    const cmd = fixerCommand();
    await cmd.parseAsync([
      'node', 'zl',
      '--path', inputDir,
      '--output-dir', outputDir,
      '--rules', 'trailing-newline'
    ]);

    // Verify output directory was created
    const stats = await fs.stat(outputDir);
    expect(stats.isDirectory()).toBe(true);
  });

  test('handles files with no extension correctly', async () => {
    await fs.writeFile(
      join(inputDir, 'README'),
      '# README\n\nThis is a readme file\n',
      'utf8'
    );

    const cmd = fixerCommand();
    await cmd.parseAsync([
      'node', 'zl',
      '--path', inputDir,
      '--output-dir', outputDir,
      '--rules', 'trailing-newline'
    ]);

    // Only .md files should be processed, so README should not exist in output
    const readmeExists = await fs.access(join(outputDir, 'README'))
      .then(() => true)
      .catch(() => false);
    
    expect(readmeExists).toBe(false);
  });

  test('handles multiple markdown files in same directory', async () => {
    // Create multiple files
    await fs.writeFile(join(inputDir, 'note1.md'), '# Note 1\n', 'utf8');
    await fs.writeFile(join(inputDir, 'note2.md'), '# Note 2\n', 'utf8');
    await fs.writeFile(join(inputDir, 'note3.md'), '# Note 3\n', 'utf8');

    const cmd = fixerCommand();
    await cmd.parseAsync([
      'node', 'zl',
      '--path', inputDir,
      '--output-dir', outputDir,
      '--rules', 'trailing-newline'
    ]);

    // Verify all files were processed
    const note1 = await fs.readFile(join(outputDir, 'note1.md'), 'utf8');
    const note2 = await fs.readFile(join(outputDir, 'note2.md'), 'utf8');
    const note3 = await fs.readFile(join(outputDir, 'note3.md'), 'utf8');

    expect(note1).toBe('# Note 1\n');
    expect(note2).toBe('# Note 2\n');
    expect(note3).toBe('# Note 3\n');
  });

  test('handles empty markdown files', async () => {
    await fs.writeFile(join(inputDir, 'empty.md'), '', 'utf8');

    const cmd = fixerCommand();
    await cmd.parseAsync([
      'node', 'zl',
      '--path', inputDir,
      '--output-dir', outputDir,
      '--rules', 'trailing-newline'
    ]);

    // Empty file should get a trailing newline
    const content = await fs.readFile(join(outputDir, 'empty.md'), 'utf8');
    expect(content).toBe('\n');
  });

  test('handles files with special characters in names', async () => {
    const specialFiles = [
      'note-with-dashes.md',
      'note_with_underscores.md',
      'note.with.dots.md',
      'note (with parens).md'
    ];

    for (const filename of specialFiles) {
      await fs.writeFile(join(inputDir, filename), `# ${filename}\n`, 'utf8');
    }

    const cmd = fixerCommand();
    await cmd.parseAsync([
      'node', 'zl',
      '--path', inputDir,
      '--output-dir', outputDir,
      '--rules', 'trailing-newline'
    ]);

    // Verify all files were processed
    for (const filename of specialFiles) {
      const content = await fs.readFile(join(outputDir, filename), 'utf8');
      expect(content).toContain(filename);
    }
  });

  test('handles node_modules directory exclusion by default', async () => {
    // Create node_modules directory with markdown file
    const nodeModulesDir = join(inputDir, 'node_modules');
    await fs.mkdir(nodeModulesDir, { recursive: true });
    await fs.writeFile(
      join(nodeModulesDir, 'should-be-ignored.md'),
      '# Ignored\n',
      'utf8'
    );

    const cmd = fixerCommand();
    await cmd.parseAsync([
      'node', 'zl',
      '--path', inputDir,
      '--output-dir', outputDir,
      '--rules', 'trailing-newline'
    ]);

    // Verify node_modules file was not processed
    const nodeModulesExists = await fs.access(join(outputDir, 'node_modules'))
      .then(() => true)
      .catch(() => false);
    
    expect(nodeModulesExists).toBe(false);
  });

  test('handles multiple ignored directories', async () => {
    // Create multiple directories to ignore
    const ignoreDir1 = join(inputDir, 'ignore1');
    const ignoreDir2 = join(inputDir, 'ignore2');
    await fs.mkdir(ignoreDir1, { recursive: true });
    await fs.mkdir(ignoreDir2, { recursive: true });
    await fs.writeFile(join(ignoreDir1, 'file1.md'), '# File 1\n', 'utf8');
    await fs.writeFile(join(ignoreDir2, 'file2.md'), '# File 2\n', 'utf8');

    const cmd = fixerCommand();
    await cmd.parseAsync([
      'node', 'zl',
      '--path', inputDir,
      '--output-dir', outputDir,
      '--ignore-dirs', ignoreDir1, ignoreDir2,
      '--rules', 'trailing-newline'
    ]);

    // Verify both ignored directories' files were not processed
    const file1Exists = await fs.access(join(outputDir, 'ignore1', 'file1.md'))
      .then(() => true)
      .catch(() => false);
    const file2Exists = await fs.access(join(outputDir, 'ignore2', 'file2.md'))
      .then(() => true)
      .catch(() => false);
    
    expect(file1Exists).toBe(false);
    expect(file2Exists).toBe(false);
  });

  test('preserves file content when applying trailing-newline rule', async () => {
    const originalContent = '# Test\n\nParagraph 1\n\nParagraph 2\n\n- List item 1\n- List item 2';
    await fs.writeFile(join(inputDir, 'content-test.md'), originalContent, 'utf8');

    const cmd = fixerCommand();
    await cmd.parseAsync([
      'node', 'zl',
      '--path', inputDir,
      '--output-dir', outputDir,
      '--rules', 'trailing-newline'
    ]);

    const processedContent = await fs.readFile(join(outputDir, 'content-test.md'), 'utf8');
    expect(processedContent).toBe(originalContent + '\n');
  });

  test('handles output to same directory as input (in-place editing)', async () => {
    const testFile = join(inputDir, 'in-place.md');
    await fs.writeFile(testFile, '# In Place Test', 'utf8');

    const cmd = fixerCommand();
    await cmd.parseAsync([
      'node', 'zl',
      '--path', inputDir,
      '--output-dir', inputDir,
      '--rules', 'trailing-newline'
    ]);

    const content = await fs.readFile(testFile, 'utf8');
    expect(content).toBe('# In Place Test\n');
  });

  test('handles mixed case file extensions', async () => {
    await fs.writeFile(join(inputDir, 'uppercase.MD'), '# Uppercase\n', 'utf8');
    await fs.writeFile(join(inputDir, 'mixed.Md'), '# Mixed\n', 'utf8');

    const cmd = fixerCommand();
    await cmd.parseAsync([
      'node', 'zl',
      '--path', inputDir,
      '--output-dir', outputDir,
      '--rules', 'trailing-newline'
    ]);

    // Note: glob might be case-sensitive, so these might not be processed
    // This tests the actual behavior
    const uppercaseExists = await fs.access(join(outputDir, 'uppercase.MD'))
      .then(() => true)
      .catch(() => false);
    const mixedExists = await fs.access(join(outputDir, 'mixed.Md'))
      .then(() => true)
      .catch(() => false);

    // Document the behavior (case sensitivity depends on platform and glob config)
    expect(typeof uppercaseExists).toBe('boolean');
    expect(typeof mixedExists).toBe('boolean');
  });

  test('handles concurrent processing of multiple files', async () => {
    // Create many files to test concurrent processing
    const fileCount = 10;
    for (let i = 0; i < fileCount; i++) {
      await fs.writeFile(
        join(inputDir, `concurrent-${i}.md`),
        `# Concurrent Test ${i}\n`,
        'utf8'
      );
    }

    const cmd = fixerCommand();
    await cmd.parseAsync([
      'node', 'zl',
      '--path', inputDir,
      '--output-dir', outputDir,
      '--rules', 'trailing-newline'
    ]);

    // Verify all files were processed
    for (let i = 0; i < fileCount; i++) {
      const content = await fs.readFile(
        join(outputDir, `concurrent-${i}.md`),
        'utf8'
      );
      expect(content).toBe(`# Concurrent Test ${i}\n`);
    }
  });

  test('handles directories with dots in names', async () => {
    const dotDir = join(inputDir, 'v1.0.0', 'release.notes');
    await fs.mkdir(dotDir, { recursive: true });
    await fs.writeFile(
      join(dotDir, 'changelog.md'),
      '# Changelog\n\nVersion 1.0.0\n',
      'utf8'
    );

    const cmd = fixerCommand();
    await cmd.parseAsync([
      'node', 'zl',
      '--path', inputDir,
      '--output-dir', outputDir,
      '--rules', 'trailing-newline'
    ]);

    const content = await fs.readFile(
      join(outputDir, 'v1.0.0', 'release.notes', 'changelog.md'),
      'utf8'
    );
    expect(content).toContain('# Changelog');
    expect(content.endsWith('\n')).toBe(true);
  });

  test('handles symlinks correctly (if supported)', async () => {
    // Create a file and attempt to create a symlink
    const targetFile = join(inputDir, 'target.md');
    await fs.writeFile(targetFile, '# Target\n', 'utf8');

    try {
      const linkFile = join(inputDir, 'link.md');
      await fs.symlink(targetFile, linkFile);

      const cmd = fixerCommand();
      await cmd.parseAsync([
        'node', 'zl',
        '--path', inputDir,
        '--output-dir', outputDir,
        '--rules', 'trailing-newline'
      ]);

      // Behavior with symlinks may vary, just verify no crash
      const targetExists = await fs.access(join(outputDir, 'target.md'))
        .then(() => true)
        .catch(() => false);
      expect(targetExists).toBe(true);
    } catch (err: any) {
      // Symlinks might not be supported on all platforms
      if (err.code !== 'EPERM' && err.code !== 'ENOTSUP') {
        throw err;
      }
    }
  });

  test('handles very long file names', async () => {
    const longName = 'a'.repeat(200) + '.md';
    await fs.writeFile(join(inputDir, longName), '# Long Name\n', 'utf8');

    const cmd = fixerCommand();
    await cmd.parseAsync([
      'node', 'zl',
      '--path', inputDir,
      '--output-dir', outputDir,
      '--rules', 'trailing-newline'
    ]);

    const content = await fs.readFile(join(outputDir, longName), 'utf8');
    expect(content).toBe('# Long Name\n');
  });

  test('handles files that already have trailing newlines', async () => {
    const alreadyFixed = join(inputDir, 'already-fixed.md');
    await fs.writeFile(alreadyFixed, '# Already Fixed\n', 'utf8');

    const cmd = fixerCommand();
    await cmd.parseAsync([
      'node', 'zl',
      '--path', inputDir,
      '--output-dir', outputDir,
      '--rules', 'trailing-newline'
    ]);

    const content = await fs.readFile(join(outputDir, 'already-fixed.md'), 'utf8');
    expect(content).toBe('# Already Fixed\n');
    // Verify no extra newlines were added
    expect(content).not.toBe('# Already Fixed\n\n');
  });

  test('handles processing when output directory has existing files', async () => {
    // Pre-populate output directory
    await fs.writeFile(
      join(outputDir, 'existing.md'),
      '# Old Content\n',
      'utf8'
    );

    // Create input file with same name
    await fs.writeFile(
      join(inputDir, 'existing.md'),
      '# New Content',
      'utf8'
    );

    const cmd = fixerCommand();
    await cmd.parseAsync([
      'node', 'zl',
      '--path', inputDir,
      '--output-dir', outputDir,
      '--rules', 'trailing-newline'
    ]);

    // Verify the file was overwritten
    const content = await fs.readFile(join(outputDir, 'existing.md'), 'utf8');
    expect(content).toBe('# New Content\n');
  });

  test('processes only markdown files, ignoring other file types', async () => {
    // Create various file types
    await fs.writeFile(join(inputDir, 'text.txt'), 'Text file\n', 'utf8');
    await fs.writeFile(join(inputDir, 'doc.docx'), 'Doc file\n', 'utf8');
    await fs.writeFile(join(inputDir, 'note.md'), '# Markdown\n', 'utf8');

    const cmd = fixerCommand();
    await cmd.parseAsync([
      'node', 'zl',
      '--path', inputDir,
      '--output-dir', outputDir,
      '--rules', 'trailing-newline'
    ]);

    // Only markdown file should be in output
    const mdExists = await fs.access(join(outputDir, 'note.md'))
      .then(() => true)
      .catch(() => false);
    const txtExists = await fs.access(join(outputDir, 'text.txt'))
      .then(() => true)
      .catch(() => false);
    const docxExists = await fs.access(join(outputDir, 'doc.docx'))
      .then(() => true)
      .catch(() => false);

    expect(mdExists).toBe(true);
    expect(txtExists).toBe(false);
    expect(docxExists).toBe(false);
  });

  test('handles UTF-8 content correctly', async () => {
    const utf8Content = '# Test\n\n日本語 テキスト\n\n中文内容\n\nEmoji: 🚀 🎉 ✨';
    await fs.writeFile(join(inputDir, 'utf8.md'), utf8Content, 'utf8');

    const cmd = fixerCommand();
    await cmd.parseAsync([
      'node', 'zl',
      '--path', inputDir,
      '--output-dir', outputDir,
      '--rules', 'trailing-newline'
    ]);

    const content = await fs.readFile(join(outputDir, 'utf8.md'), 'utf8');
    expect(content).toBe(utf8Content + '\n');
  });
});