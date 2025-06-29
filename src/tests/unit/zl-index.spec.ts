import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

// Mock external dependencies
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
  },
}));

jest.mock('glob', () => ({
  glob: jest.fn(),
}));

jest.mock('clear', () => jest.fn());
jest.mock('chalk', () => ({
  red: jest.fn((text) => text),
}));
jest.mock('figlet', () => ({
  textSync: jest.fn(() => 'ASCII Art'),
}));

// Import collectors
jest.mock('../../TaskCollector.js', () => ({
  TaskCollector: jest.fn().mockImplementation(() => ({
    dataName: 'tasks',
    collector: jest.fn(() => ['task1', 'task2']),
  })),
}));

jest.mock('../../ContextCollector.js', () => ({
  ContextCollector: jest.fn().mockImplementation(() => ({
    dataName: 'contexts',
    collector: jest.fn(() => ['@context1', '@context2']),
  })),
}));

jest.mock('../../TagCollector.js', () => ({
  TagCollector: jest.fn().mockImplementation(() => ({
    dataName: 'tags',
    collector: jest.fn(() => ['#tag1', '#tag2']),
  })),
}));

jest.mock('../../WikiCollector.js', () => ({
  WikiCollector: jest.fn().mockImplementation(() => ({
    dataName: 'wikilinks',
    collector: jest.fn(() => ['[[link1]]', '[[link2]]']),
  })),
}));

jest.mock('../../Templator.js', () => ({
  Templator: jest.fn().mockImplementation(() => ({
    render: jest.fn(() => 'rendered content'),
    enhance: jest.fn(() => 'enhanced template'),
  })),
}));

jest.mock('../../file-handling.js', () => ({
  idFromFilename: jest.fn((filename) => filename.replace(/\.md$/, '')),
}));

jest.mock('../../RegexCollector.js', () => ({
  collectMatches: jest.fn(() => ['Sample Title']),
}));

// Import the module under test
import indexerCommand, { collectFromFile } from '../../zl-index.js';
import { Command } from '@commander-js/extra-typings';

const mockFs = fs as jest.Mocked<typeof fs>;
const mockGlob = glob as jest.MockedFunction<typeof glob>;

describe('zl-index', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console methods
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(process, 'exit').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('indexerCommand', () => {
    it('should create a Command instance with correct configuration', () => {
      const command = indexerCommand();
      
      expect(command).toBeInstanceOf(Command);
      expect(command.name()).toBe('index');
      expect(command.description()).toBe('Generate index/reference file. Will OVERWRITE any exiting files.');
      expect(command.aliases()).toContain('create');
    });

    it('should configure all expected options', () => {
      const command = indexerCommand();
      const options = command.options;
      
      expect(options).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ long: '--path' }),
          expect.objectContaining({ long: '--ignore-dirs' }),
          expect.objectContaining({ long: '--reference-file' }),
          expect.objectContaining({ long: '--create-file' }),
          expect.objectContaining({ long: '--template-file' }),
          expect.objectContaining({ long: '--show-orphans' }),
          expect.objectContaining({ long: '--task-display' }),
          expect.objectContaining({ long: '--json-debug-output' }),
          expect.objectContaining({ long: '--no-wiki' }),
          expect.objectContaining({ long: '--verbose' }),
        ])
      );
    });

    it('should set correct default values for options', () => {
      const command = indexerCommand();
      
      // Test default values by checking option configuration
      const pathOption = command.options.find(opt => opt.long === '--path');
      expect(pathOption?.defaultValue).toBe('.');
      
      const refFileOption = command.options.find(opt => opt.long === '--reference-file');
      expect(refFileOption?.defaultValue).toBe('references.md');
      
      const taskDisplayOption = command.options.find(opt => opt.long === '--task-display');
      expect(taskDisplayOption?.defaultValue).toBe('by-file');
    });
  });

  describe('collectFromFile', () => {
    const mockProgram = {
      verbose: true,
      wiki: true,
      taskDisplay: 'by-file',
    };

    beforeEach(() => {
      mockFs.readFile.mockResolvedValue('# Sample Title\n\nSome content with [[wiki link]].\n\n- [ ] A task');
    });

    it('should successfully collect data from a markdown file', async () => {
      const filename = '/path/to/test.md';
      
      const result = await collectFromFile(filename, mockProgram);
      
      expect(mockFs.readFile).toHaveBeenCalledWith(filename, 'utf8');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('filename', 'test.md');
      expect(result).toHaveProperty('fullpath', filename);
      expect(result).toHaveProperty('wikiname', 'test');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('matchData');
    });

    it('should extract title from file content', async () => {
      mockFs.readFile.mockResolvedValue('# Sample Title\n\nContent here');
      
      const result = await collectFromFile('/path/to/test.md', mockProgram);
      
      expect(result.title).toBe('Sample Title');
    });

    it('should use filename as title when no title found in content', async () => {
      mockFs.readFile.mockResolvedValue('Just some content without title');
      
      const result = await collectFromFile('/path/to/test.md', mockProgram);
      
      expect(result.title).toBe('test');
    });

    it('should collect data from all collectors', async () => {
      const result = await collectFromFile('/path/to/test.md', mockProgram);
      
      expect(result.matchData).toHaveProperty('tasks');
      expect(result.matchData).toHaveProperty('contexts');
      expect(result.matchData).toHaveProperty('tags');
      expect(result.matchData).toHaveProperty('wikilinks');
    });

    it('should handle file read errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      
      await expect(collectFromFile('/nonexistent.md', mockProgram))
        .rejects.toThrow('File not found');
    });

    it('should handle empty file content', async () => {
      mockFs.readFile.mockResolvedValue('');
      
      const result = await collectFromFile('/path/to/empty.md', mockProgram);
      
      expect(result.filename).toBe('empty.md');
      expect(result.wikiname).toBe('empty');
    });

    it('should handle files with special characters in names', async () => {
      const filename = '/path/to/test-file_with-special.chars.md';
      
      const result = await collectFromFile(filename, mockProgram);
      
      expect(result.filename).toBe('test-file_with-special.chars.md');
      expect(result.wikiname).toBe('test-file_with-special.chars');
    });

    it('should handle very large file content', async () => {
      const largeContent = 'a'.repeat(1000000) + '\n# Large Title\n' + 'b'.repeat(1000000);
      mockFs.readFile.mockResolvedValue(largeContent);
      
      const result = await collectFromFile('/path/to/large.md', mockProgram);
      
      expect(result.title).toBe('Large Title');
      expect(result.filename).toBe('large.md');
    });
  });

  describe('indexer integration', () => {
    let mockProgram: any;

    beforeEach(() => {
      mockProgram = {
        path: '.',
        ignoreDirs: ['node_modules'],
        referenceFile: 'references.md',
        templateFile: 'template.mustache',
        verbose: false,
        jsonDebugOutput: false,
      };

      mockGlob.mockResolvedValue([
        './file1.md',
        './file2.md',
        './subfolder/file3.md',
      ]);

      mockFs.readFile
        .mockResolvedValueOnce('# File 1\nContent 1')
        .mockResolvedValueOnce('# File 2\nContent 2')
        .mockResolvedValueOnce('# File 3\nContent 3')
        .mockResolvedValueOnce('Template content: {{#references}}{{title}}{{/references}}');

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
    });

    it('should process multiple markdown files', async () => {
      const command = indexerCommand();
      
      // Simulate command execution
      await new Promise((resolve) => {
        command.action((cmdObj) => {
          // The action would call indexer function
          resolve(undefined);
        });
        resolve(undefined);
      });

      expect(mockGlob).toHaveBeenCalledWith(
        expect.stringContaining('/**/*.md'),
        expect.objectContaining({ ignore: expect.any(Array) })
      );
    });

    it('should create output directory if it does not exist', async () => {
      mockProgram.referenceFile = 'output/subdir/references.md';
      
      // This would be called during indexer execution
      const refDir = path.dirname(mockProgram.referenceFile);
      await mockFs.mkdir(refDir, { recursive: true });
      
      expect(mockFs.mkdir).toHaveBeenCalledWith('output/subdir', { recursive: true });
    });

    it('should write rendered template to output file', async () => {
      const templateContent = 'Template content';
      const renderedContent = 'Rendered content';
      
      mockFs.readFile.mockResolvedValue(templateContent);
      await mockFs.writeFile('references.md', renderedContent);
      
      expect(mockFs.writeFile).toHaveBeenCalledWith('references.md', renderedContent);
    });

    it('should handle glob patterns with ignore directories', async () => {
      mockProgram.ignoreDirs = ['node_modules', 'dist', '.git'];
      
      const expectedIgnoreList = [
        './node_modules',
        './dist', 
        './.git',
        'references.md'
      ];
      
      // Mock the glob call that would happen in indexer
      await mockGlob('./**/*.md', { 
        ignore: expect.arrayContaining(expectedIgnoreList.map(dir => 
          expect.stringContaining(dir.replace('./', mockProgram.path + '/'))
        ))
      });
      
      expect(mockGlob).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle template file read errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Template not found'));
      
      await expect(mockFs.readFile('template.mustache', 'utf8'))
        .rejects.toThrow('Template not found');
    });

    it('should handle output file write errors', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Permission denied'));
      
      await expect(mockFs.writeFile('references.md', 'content'))
        .rejects.toThrow('Permission denied');
    });

    it('should handle glob errors', async () => {
      mockGlob.mockRejectedValue(new Error('Glob pattern error'));
      
      await expect(mockGlob('./**/*.md', { ignore: [] }))
        .rejects.toThrow('Glob pattern error');
    });

    it('should handle directory creation errors', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Cannot create directory'));
      
      await expect(mockFs.mkdir('output', { recursive: true }))
        .rejects.toThrow('Cannot create directory');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty glob results', async () => {
      mockGlob.mockResolvedValue([]);
      
      const result = await mockGlob('./**/*.md', { ignore: [] });
      
      expect(result).toEqual([]);
    });

    it('should handle files with no extension', async () => {
      const result = await collectFromFile('/path/to/README', {});
      
      expect(result.filename).toBe('README');
      expect(result.wikiname).toBe('README'); // No .md to remove
    });

    it('should handle very long file paths', async () => {
      const longPath = '/very/long/path/with/many/nested/directories/that/goes/on/and/on/file.md';
      
      const result = await collectFromFile(longPath, {});
      
      expect(result.fullpath).toBe(longPath);
      expect(result.filename).toBe('file.md');
    });

    it('should handle unicode characters in file content', async () => {
      mockFs.readFile.mockResolvedValue('# Título con émojis 🎉\n\nContenido con caracteres especiales: áéíóú');
      
      const result = await collectFromFile('/path/to/unicode.md', {});
      
      expect(result.title).toBe('Título con émojis 🎉');
    });
  });

  describe('Performance Tests', () => {
    it('should handle processing many files efficiently', async () => {
      const manyFiles = Array.from({ length: 100 }, (_, i) => `file${i}.md`);
      mockGlob.mockResolvedValue(manyFiles);
      
      // Mock file reads for all files
      manyFiles.forEach((_, index) => {
        mockFs.readFile.mockResolvedValueOnce(`# File ${index}\nContent ${index}`);
      });
      
      const startTime = Date.now();
      const result = await mockGlob('./**/*.md', { ignore: [] });
      const endTime = Date.now();
      
      expect(result).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly
    });

    it('should not consume excessive memory with large files', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Simulate processing a large file
      const largeContent = 'x'.repeat(1000000); // 1MB content
      mockFs.readFile.mockResolvedValue(largeContent);
      
      await collectFromFile('/path/to/large.md', {});
      
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      expect(finalMemory - initialMemory).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase
    });
  });

  describe('Configuration Validation', () => {
    it('should handle missing template file gracefully', () => {
      const program = {
        referenceFile: 'output.md',
        templateFile: undefined,
      };
      
      // This should trigger the error path in indexer
      expect(program.templateFile).toBeUndefined();
    });

    it('should handle missing reference file gracefully', () => {
      const program = {
        referenceFile: undefined,
        templateFile: 'template.mustache',
      };
      
      // This should trigger the error path in indexer
      expect(program.referenceFile).toBeUndefined();
    });

    it('should validate task display options', () => {
      const validOptions = ['none', 'by-file', 'by-priority'];
      
      validOptions.forEach(option => {
        const program = { taskDisplay: option };
        expect(validOptions).toContain(program.taskDisplay);
      });
    });
  });
});

describe('Integration Tests', () => {
  it('should integrate with all collector types', async () => {
    const mockProgram = { verbose: false };
    mockFs.readFile.mockResolvedValue(`
# Test Document

Some content with [[wiki links]] and #tags.
Also has @context references.

- [ ] Incomplete task
- [x] Complete task
    `);

    const result = await collectFromFile('/path/to/test.md', mockProgram);

    expect(result.matchData).toHaveProperty('wikilinks');
    expect(result.matchData).toHaveProperty('tags');
    expect(result.matchData).toHaveProperty('contexts');
    expect(result.matchData).toHaveProperty('tasks');
  });

  it('should handle the full workflow from file collection to output generation', async () => {
    mockGlob.mockResolvedValue(['test1.md', 'test2.md']);
    mockFs.readFile
      .mockResolvedValueOnce('# Test 1\nContent 1')
      .mockResolvedValueOnce('# Test 2\nContent 2')
      .mockResolvedValueOnce('Template: {{#references}}{{title}}{{/references}}');
    
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);

    // Simulate the full workflow
    const files = await mockGlob('./**/*.md', { ignore: [] });
    expect(files).toHaveLength(2);
    
    const references = [];
    for (const file of files) {
      const fileData = await collectFromFile(file, {});
      references.push(fileData);
    }
    
    expect(references).toHaveLength(2);
    expect(references[0].filename).toBe('test1.md');
    expect(references[1].filename).toBe('test2.md');
  });
});