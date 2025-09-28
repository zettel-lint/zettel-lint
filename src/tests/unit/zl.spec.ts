/**
 * Tests for src/zl.ts (CLI entrypoint)
 * Testing library/framework: Vitest (from package.json scripts: "vitest")
 * Notes:
 * - We mock external deps (clear, figlet, chalk) and command factories.
 * - We avoid flags that cause commander to exit; process.exit is stubbed regardless.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from '@commander-js/extra-typings';

// ---- Mocks for external modules ----
const clearMock = vi.fn();
const figletMock = { textSync: vi.fn(() => 'ASCII ART') };
const chalkMock = { red: vi.fn((s: string) => `[[red]]${s}`) };

vi.mock('clear', () => ({ default: clearMock }));
vi.mock('figlet', () => ({ default: figletMock }));
vi.mock('chalk', () => ({ default: chalkMock }));

// ---- Mocks for subcommand factory modules used by src/zl.ts ----
const indexerCommandFactory = vi.fn(() => new Command('index'));
const importerCommandFactory = vi.fn(() => new Command('import'));
const notesCommandFactory   = vi.fn(() => new Command('notes'));
const fixerCommandFactory   = vi.fn(() => new Command('fix'));

vi.mock('../../zl-index.js', () => ({ default: indexerCommandFactory }));
vi.mock('../../zl-import.js', () => ({ default: importerCommandFactory }));
vi.mock('../../zl-notes.js', () => ({ default: notesCommandFactory }));
vi.mock('../../zl-fix.js', () => ({ default: fixerCommandFactory }));

// Helper to import the CLI fresh each test
async function importCLI() {
  // Import the TS source (the file under test)
  return import('../../zl.ts');
}

describe('zl CLI entrypoint', () => {
  let originalArgv: string[];
  let logSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let addCmdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();

    originalArgv = process.argv.slice();
    process.argv = ['node', 'zl.ts']; // baseline args

    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    // Prevent real process exit if commander decides to exit
    exitSpy = vi
      .spyOn(process, 'exit')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation((() => undefined) as any);

    addCmdSpy = vi.spyOn(Command.prototype as unknown as { addCommand: () => void }, 'addCommand');

    clearMock.mockClear();
    figletMock.textSync.mockClear();
    chalkMock.red.mockClear();

    indexerCommandFactory.mockClear();
    importerCommandFactory.mockClear();
    notesCommandFactory.mockClear();
    fixerCommandFactory.mockClear();
  });

  afterEach(() => {
    logSpy.mockRestore();
    exitSpy.mockRestore();
    addCmdSpy.mockRestore();
    process.argv = originalArgv;
  });

  describe('exports', () => {
    it('exports version as 0.13.2 (semver string)', async () => {
      const mod = await importCLI();
      expect(mod).toHaveProperty('version');
      expect(mod.version).toBe('0.13.2');
      expect(mod.version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('startup banner and command registration', () => {
    it('prints startup banner and registers four subcommands', async () => {
      await importCLI();

      // Banner includes version
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('zettel-lint (v0.13.2)')
      );

      // Subcommand factories called once each
      expect(indexerCommandFactory).toHaveBeenCalledTimes(1);
      expect(importerCommandFactory).toHaveBeenCalledTimes(1);
      expect(notesCommandFactory).toHaveBeenCalledTimes(1);
      expect(fixerCommandFactory).toHaveBeenCalledTimes(1);

      // Program.addCommand invoked four times
      expect(addCmdSpy.mock.calls.length).toBe(4);

      // No verbose side-effects by default
      expect(clearMock).not.toHaveBeenCalled();
      expect(figletMock.textSync).not.toHaveBeenCalled();
      expect(chalkMock.red).not.toHaveBeenCalled();
    });

    it('honors --verbose: clears screen and prints red ASCII art', async () => {
      process.argv = ['node', 'zl.ts', '--verbose'];

      await importCLI();

      expect(clearMock).toHaveBeenCalledTimes(1);
      expect(figletMock.textSync).toHaveBeenCalledWith('zettel-lint', { horizontalLayout: 'full' });
      expect(chalkMock.red).toHaveBeenCalledWith('ASCII ART');
      expect(logSpy).toHaveBeenCalledWith('[[red]]ASCII ART');
    });
  });

  describe('error propagation', () => {
    it('propagates error from subcommand factory', async () => {
      indexerCommandFactory.mockImplementationOnce(() => {
        throw new Error('factory failure');
      });

      await expect(importCLI()).rejects.toThrow('factory failure');
    });

    it('propagates figlet error in verbose mode', async () => {
      figletMock.textSync.mockImplementationOnce(() => {
        throw new Error('figlet crashed');
      });
      process.argv = ['node', 'zl.ts', '--verbose'];

      await expect(importCLI()).rejects.toThrow('figlet crashed');
    });

    it('propagates clear error in verbose mode', async () => {
      clearMock.mockImplementationOnce(() => {
        throw new Error('clear failed');
      });
      process.argv = ['node', 'zl.ts', '--verbose'];

      await expect(importCLI()).rejects.toThrow('clear failed');
    });
  });

  describe('file structure assertions', () => {
    it('has a shebang in src/zl.ts for node execution', async () => {
      const fs = await import('fs/promises');
      const content = await fs.readFile('src/zl.ts', 'utf8');
      expect(content.startsWith('#\!/usr/bin/env node')).toBe(true);
    });
  });
});