import { describe, expect, test } from 'vitest'
import indexerCommand from "../../zl-index";

describe('indexerCommand', () => {
    test('adds index to cli', () => {
        expect(indexerCommand().name()).toBe("index");
      });

    test('can parse ignoreDirs', () => {
      const opts = indexerCommand().parse(["node", "zl", "--path", ".", "--ignore-dirs", "node_modules", "bin"]);
      expect(opts.args).toEqual([]);
      expect(opts.opts()["ignoreDirs"]).toBeDefined();
      expect(opts.opts().ignoreDirs).toEqual(["node_modules", "bin"]); 
    });

    test('can parse path', () => {
      expect(indexerCommand().parse(["node", "zl", "--ignore-dirs", "node_modules", "--path", "."]).opts().path).toBe(".");
    });

    test('can parse verbose option', () => {
      const opts = indexerCommand().parse(["node", "zl", "--verbose"]);
      expect(opts.opts().verbose).toBe(true);
    });

    test('can parse multiple options', () => {
      const opts = indexerCommand().parse(["node", "zl", "--path", ".", "--verbose"]);
      expect(opts.opts().path).toBe(".");
      expect(opts.opts().verbose).toBe(true);
    });
});