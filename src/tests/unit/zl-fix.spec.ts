import { describe, expect, test } from 'vitest'
import fixerCommand from "../../zl-fix";

describe('fixerCommand', () => {
    test('adds fix to cli', () => {
        expect(fixerCommand().name()).toBe("fix");
      });

    test('can parse ignoreDirs', () => {
      const cmd = fixerCommand().action(() => {});
      const opts = cmd.parse(
        ["node", "zl", "--path", ".", "--ignore-dirs", "node_modules", "bin", "--rules", "id-to-wiki-links"],
        { from: "user" }
      );
      expect(opts.args).toEqual([]);
      expect(opts.opts()["ignoreDirs"]).toBeDefined();
      expect(opts.opts().ignoreDirs).toEqual(["node_modules", "bin"]); 
    });

    test('can parse rules', () => {
      const cmd = fixerCommand().action(() => {});
      const opts = cmd.parse(
        ["node", "zl", "--path", ".", "--rules", "id-to-wiki-links", "normalize-frontmatter", "copy-inline-props-to-frontmatter"],
        { from: "user" }
      );
      expect(opts.args).toEqual([]);
      expect(opts.opts()["rules"]).toBeDefined();
      expect(opts.opts().rules).toEqual([
        "id-to-wiki-links",
        "normalize-frontmatter",
        "copy-inline-props-to-frontmatter"
      ]); 
    });

    test('can parse path', () => {
      const cmd = fixerCommand().action(() => {});
      expect(
        cmd.parse(
          ["node", "zl", "--ignore-dirs", "node_modules", "--path", "."],
          { from: "user" }
        ).opts().path
      ).toBe(".");
    });

    test('can parse verbose option', () => {
      const cmd = fixerCommand().action(() => {});
      const opts = cmd.parse(
        ["node", "zl", "--verbose", "--rules", "id-to-wiki-links"],
        { from: "user" }
      );
      expect(opts.opts().verbose).toBe(true);
    });

    test('can parse multiple options', () => {
      const cmd = fixerCommand().action(() => {});
      const opts = cmd.parse(
        ["node", "zl", "--path", ".", "--verbose", "--rules", "id-to-wiki-links", "normalize-frontmatter"],
        { from: "user" }
      );
      expect(opts.opts().path).toBe(".");
      expect(opts.opts().verbose).toBe(true);
    });
});