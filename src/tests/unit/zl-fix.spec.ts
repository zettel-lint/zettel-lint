import { describe, expect, test } from 'vitest'
import fixerCommand from "../../zl-fix";

describe('fixerCommand', () => {
    test('adds fix to cli', () => {
        expect(fixerCommand().name()).toBe("fix");
      });

    test('can parse ignoreDirs', () => {
      const opts = fixerCommand().parse(["node", "zl", "--path", ".", "--ignore-dirs", "node_modules", "bin"]);
      expect(opts.args).toEqual([]);
      expect(opts.opts()["ignoreDirs"]).toBeDefined();
      expect(opts.opts().ignoreDirs).toEqual(["node_modules", "bin"]); 
    });

    test('can parse rules', () => {
      const opts = fixerCommand().parse(["node", "zl", "--path", ".", "--rules", "id-to-wiki-links", "normalize-frontmatter", "copy-inline-props-to-frontmatter"]);
      expect(opts.args).toEqual([]);
      expect(opts.opts()["rules"]).toBeDefined();
      expect(opts.opts().rules).toEqual(["id-to-wiki-links", "normalize-frontmatter", "copy-inline-props-to-frontmatter"]); 
    });


    test('can parse path', () => {
      expect(fixerCommand().parse(["node", "zl", "--ignore-dirs", "node_modules", "--path", "."]).opts().path).toBe(".");
    });

    test('can parse verbose option', () => {
      const opts = fixerCommand().parse(["node", "zl", "--verbose"]);
      expect(opts.opts().verbose).toBe(true);
    });

    test('can parse multiple options', () => {
      const opts = fixerCommand().parse(["node", "zl", "--path", ".", "--verbose"]);
      expect(opts.opts().path).toBe(".");
      expect(opts.opts().verbose).toBe(true);
    });
});