import { describe, expect, test } from "vitest";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import fixerCommand from "../../cli/zl-fix.js";
import { loadFixConfig } from "../../fix-config.js";
import { fixNotes } from "../../zl-fix-core.js";
import { FileAdapter, toFilePath } from "../../file-system.js";

describe("fix configuration files (issue #998)", () => {
  test("loadFixConfig parses valid JSON config", async () => {
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

    const config = await loadFixConfig(configFile);
    expect(config.rules).toEqual(["trailing-newline"]);
    expect(config.propertyFilter).toEqual(["^inline$"]);
    expect(config.move).toBe(true);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("loadFixConfig parses valid YAML config", async () => {
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

    const config = await loadFixConfig(configFile);
    expect(Array.isArray(config.rules)).toBe(true);
    expect(config.rules?.[0]).toEqual({
      name: "trailing-newline",
      include: ["notes/*.md"],
      exclude: ["notes/drafts/*.md"],
    });
    expect(config.move).toBe(false);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test.each(["-", "stdin"])("loadFixConfig waits for delayed stdin and EOF (%s)", async (input: string) => {
    const child = spawn(process.execPath, ["--import", "tsx", "--input-type=module", "-e",
      `import { loadFixConfig } from './src/fix-config.ts'; console.log(JSON.stringify(await loadFixConfig('${input}')));`],
      { stdio: ["pipe", "pipe", "pipe"] });
    let output = "";
    let errors = "";
    child.stdout.on("data", chunk => output += chunk);
    child.stderr.on("data", chunk => errors += chunk);
    const finished = new Promise<number | null>((resolve, reject) => {
      child.on("error", reject);
      child.on("close", resolve);
    });
    const timer = setTimeout(() => {
      child.stdin.write('{"rules":');
      child.stdin.end('["trailing-newline"]}');
    }, 300);
    try {
      expect(await finished, errors).toBe(0);
      expect(JSON.parse(output).rules).toEqual(["trailing-newline"]);
    } finally {
      clearTimeout(timer);
      child.kill();
    }
  });

  test.each([
    [{ rules: {} }, "rules must"],
    [{ rules: [null] }, "rules[0].name"],
    [{ rules: [{}] }, "rules[0].name"],
    [{ rules: [{ name: 2 }] }, "rules[0].name"],
    [{ rules: [""] }, "rules[0].name"],
    [{ rules: [{ name: "trailing-newline", include: "*.md" }] }, "rules[0].include"],
    [{ rules: [{ name: "trailing-newline", include: [2] }] }, "rules[0].include"],
    [[], "Configuration file must contain an object"],
  ])("rejects invalid configuration %j", async (value: unknown, field: string) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "zl-config-"));
    try {
      const file = path.join(tmpDir, "config.json");
      fs.writeFileSync(file, JSON.stringify(value));
      await expect(loadFixConfig(file)).rejects.toThrow(field);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test.each([[false, true], [true, false], [false, false]])("CLI applies per-rule settings with --move=%s and rule move=%s", async (cliMove: boolean, ruleMove: boolean) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "zl-rule-"));
    try {
      const file = path.join(tmpDir, "note.md");
      const config = path.join(tmpDir, "config.json");
      fs.writeFileSync(file, "[keep:: yes] [other:: no]");
      fs.writeFileSync(config, JSON.stringify({ rules: [{
        name: "inline-properties-to-frontmatter", move: ruleMove, propertyFilter: ["^keep$"],
      }] }));
      await fixerCommand().parseAsync(["node", "zl", "--path", tmpDir, "--config", config, ...(cliMove ? ["--move"] : [])]);
      const result = fs.readFileSync(file, "utf8");
      expect(result).toContain("keep:\n  - yes");
      expect(result.includes("[keep:: yes]")).toBe(!(cliMove || ruleMove));
      expect(result).toContain("[other:: no]");
      expect(result).not.toContain("other: no");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test.each([undefined, "output"])("CLI rule globs use a stable cwd base with output %s", async (output: string | undefined) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "zl-glob-"));
    try {
      const notes = path.join(tmpDir, "notes");
      fs.mkdirSync(notes);
      fs.writeFileSync(path.join(notes, "file.md"), "content");
      const config = path.join(tmpDir, "config.json");
      fs.writeFileSync(config, JSON.stringify({ rules: [{ name: "trailing-newline",
        include: [path.relative(process.cwd(), notes).split(path.sep).join("/") + "/file.*"],
      }] }));
      await fixerCommand().parseAsync(["node", "zl", "--path", notes, "--config", config,
        ...(output ? ["--output-dir", path.join(tmpDir, output)] : [])]);
      expect(fs.readFileSync(path.join(tmpDir, output ?? "notes", "file.md"), "utf8")).toBe("content\n");
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
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
    const parsed = await cmd.parseAsync([
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

  test.each([
    ["file.*", "file.md", true],
    ["file.*", "fileXmd", false],
    ["file.*", "file.md/nested.md", false],
    ["notes/*.md", "notes/sub/file.md", false],
    ["notes/**.md", "notes/sub/file.md", true],
    ["notes/?.md", "notes/a.md", true],
    ["notes/file[1].md", "notes/file[1].md", true],
  ])("rule glob %s matches %s: %s", async (pattern: string, filename: string, matches: boolean) => {
    let written = false;
    await fixNotes({ path: toFilePath(""), outputDir: toFilePath(""), rules: ["trailing-newline"],
      ruleConfigs: [{ name: "trailing-newline", include: [pattern] }], verbose: false, move: false }, {
      listFiles: async () => [toFilePath(filename)], readFile: async () => "content",
      writeFile: async () => { written = true; },
    });
    expect(written).toBe(matches);
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
