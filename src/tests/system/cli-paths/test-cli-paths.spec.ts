import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NodeFileAdapter } from "../../../file-adapter.js";
import { toFilePath } from "../../../file-system.js";

const sourceCli = path.resolve(import.meta.dirname, "../../../cli/zl.ts");
const tsx = path.resolve(import.meta.dirname, "../../../../node_modules/tsx/dist/cli.mjs");
// Postbuild also copies this TypeScript test into lib, where the CLI is JavaScript.
const cliArgs = existsSync(sourceCli)
  ? [tsx, sourceCli]
  : [path.resolve(import.meta.dirname, "../../../cli/zl.js")];

function runCli(root: string, args: string[]): void {
  execFileSync(process.execPath, [...cliArgs, ...args], { cwd: root, stdio: "pipe" });
}

describe("CLI scan and output paths", () => {
  it.each([false, true])("anchors index exclusions to --path (absolute exclusion: %s)", async (absolute: boolean) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "zettel-lint-index-paths-"));
    try {
      const adapter = new NodeFileAdapter(root);
      await adapter.writeFile(toFilePath("notes[1]/note.md"), "# Included");
      await adapter.writeFile(toFilePath("notes[1]/private/skip.md"), "# Excluded");
      await adapter.writeFile(toFilePath("template.mustache"), "{{#notes}}{{title}}\n{{/notes}}");
      runCli(root, [
        "index", "--path", "notes[1]", "--template-file", "template.mustache",
        "--reference-file", "references.md", "--create-file", "references.md",
        "--ignore-dirs", absolute ? path.join(root, "notes[[]1[]]/private/**") : "./private/**",
      ]);
      expect(await adapter.readFile(toFilePath("references.md"))).toBe("Included\n");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it.each([false, true])("resolves fix output and exclusions (explicit output: %s)", async (explicit: boolean) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "zettel-lint-fix-paths-"));
    try {
      const adapter = new NodeFileAdapter(root);
      await adapter.writeFile(toFilePath("notes[1]/nested/note.md"), "# Note");
      await adapter.writeFile(toFilePath("notes[1]/private/skip.md"), "# Excluded");
      runCli(root, [
        "fix", "--path", "notes[1]", "--rules", "trailing-newline",
        ...(explicit ? ["--output-dir", "."] : []),
        "--ignore-dirs", "private/**",
      ]);
      expect(await adapter.readFile(toFilePath("notes[1]/nested/note.md"))).toBe(explicit ? "# Note" : "# Note\n");
      expect(await adapter.readFile(toFilePath("notes[1]/private/skip.md"))).toBe("# Excluded");
      if (explicit) {
        expect(await adapter.readFile(toFilePath("nested/note.md"))).toBe("# Note\n");
        await expect(adapter.readFile(toFilePath("private/skip.md"))).rejects.toMatchObject({ code: "ENOENT" });
      } else {
        await expect(adapter.readFile(toFilePath("nested/note.md"))).rejects.toMatchObject({ code: "ENOENT" });
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
