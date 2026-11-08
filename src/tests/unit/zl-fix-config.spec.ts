import { describe, expect, test, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import fixerCommand from "../../cli/zl-fix.js";
import { loadFixConfig } from "../../fix-config.js";
import { fixNotes } from "../../zl-fix-core.js";
import { FileAdapter, toFilePath } from "../../file-system.js";

describe("fix configuration files (issue #998)", () => {
  test("loadFixConfig parses valid JSON config", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "zl-test-"));
    const configFile = path.join(tmpDir, "config.json");
    fs.writeFileSync(
      configFile,
      JSON.stringify({
        rules: ["trailing-newline"],
        propertyFilter: ["^inline$"],
        move: true,
      })
    );

    const config = loadFixConfig(configFile);
    expect(config.rules).toEqual(["trailing-newline"]);
    expect(config.propertyFilter).toEqual(["^inline$"]);
    expect(config.move).toBe(true);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("loadFixConfig parses valid YAML config", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "zl-test-"));
    const configFile = path.join(tmpDir, "config.yaml");
    fs.writeFileSync(
      configFile,
      `
rules:
  - name: trailing-newline
    include:
      - "notes/*.md"
    exclude:
      - "notes/drafts/*.md"
move: false
`
    );

    const config = loadFixConfig(configFile);
    expect(Array.isArray(config.rules)).toBe(true);
    expect(config.rules?.[0]).toEqual({
      name: "trailing-newline",
      include: ["notes/*.md"],
      exclude: ["notes/drafts/*.md"],
    });
    expect(config.move).toBe(false);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("loadFixConfig reads from stdin when input is '-'", () => {
    const spy = vi.spyOn(fs, "readFileSync").mockImplementation((fd: unknown) => {
      if (fd === 0) {
        return '{"rules": ["trailing-newline"]}';
      }
      return "";
    });

    const config = loadFixConfig("-");
    expect(config.rules).toEqual(["trailing-newline"]);

    spy.mockRestore();
  });

  test("CLI options override configuration file rules (criterion 1)", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "zl-test-"));
    const configFile = path.join(tmpDir, "config.json");
    fs.writeFileSync(
      configFile,
      JSON.stringify({
        rules: ["trailing-newline"],
      })
    );

    const cmd = fixerCommand();
    const parsed = cmd.parse([
      "node",
      "zl",
      "--path",
      tmpDir,
      "--config",
      configFile,
      "--rules",
      "inline-properties-to-frontmatter",
    ]);

    expect(parsed.opts().config).toBe(configFile);
    expect(parsed.opts().rules).toEqual(["inline-properties-to-frontmatter"]);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("fixNotes respects per-rule include and exclude globs (criterion 4)", async () => {
    const store = new Map<string, string>([
      ["notes/included.md", "Content without newline"],
      ["notes/drafts/excluded.md", "Content without newline"],
    ]);

    const adapter: FileAdapter = {
      listFiles: async () => [toFilePath("notes/included.md"), toFilePath("notes/drafts/excluded.md")],
      readFile: async (p) => store.get(p) ?? "",
      writeFile: async (p, content) => {
        store.set(p, content);
      },
    };

    await fixNotes(
      {
        path: toFilePath("notes"),
        outputDir: toFilePath("notes"),
        rules: ["trailing-newline"],
        ruleConfigs: [
          {
            name: "trailing-newline",
            include: ["notes/*.md"],
            exclude: ["notes/drafts/*.md"],
          },
        ],
        verbose: false,
        move: false,
      },
      adapter
    );

    expect(store.get("notes/included.md")).toBe("Content without newline\n");
    expect(store.get("notes/drafts/excluded.md")).toBe("Content without newline");
  });
});
