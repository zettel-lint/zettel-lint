import { mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, vi } from "vitest";
import { FilePath, SearchPattern, toFilePath, toSearchPattern } from "../../file-system.js";
import type { FileAdapter } from "../../file-system.js";
import { NodeFileAdapter } from "../../file-adapter.js";
import { indexer } from "../../zl-index-core.js";
import { fixNotes } from "../../zl-fix-core.js";
import { ZlFixOptions, ZlIndexOptions } from "../../core-options.js";

class MemoryFileAdapter implements FileAdapter {
  public files = new Map<FilePath, string>();
  public createdDirs = new Set<FilePath>();
  public readError?: Error;
  public writeError?: Error;

  async listFiles(include?: SearchPattern[], exclude?: SearchPattern[]): Promise<FilePath[]> {
    const matches = (filepath: string, pattern: string): boolean => {
      const regex = new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replaceAll("**/", "\u0000").replaceAll("**", ".*").replaceAll("*", "[^/]*").replaceAll("\u0000", "(?:.*/)?")}$`);
      return regex.test(filepath);
    };
    return [...this.files.keys()].filter((filepath) =>
      (!include?.length || include.some((pattern) => matches(filepath, pattern))) &&
      !exclude?.some((pattern) => matches(filepath, pattern)),
    );
  }

  async readFile(filepath: FilePath): Promise<string> {
    if (this.readError) {
      throw this.readError;
    }
    const content = this.files.get(filepath);
    if (content === undefined) {
      throw Object.assign(new Error(`File not found: ${filepath}`), { code: "ENOENT" });
    }
    return content;
  }

  async writeFile(filepath: FilePath, content: string): Promise<void> {
    if (this.writeError) {
      throw this.writeError;
    }
    this.files.set(filepath, content);
  }

  async mkdir(dirpath: FilePath): Promise<void> {
    this.createdDirs.add(dirpath);
  }
}

function indexOptions(): ZlIndexOptions {
  return {
    path: toFilePath(""),
    ignoreDirs: undefined,
    referenceFile: toFilePath("references.md"),
    createFile: toFilePath("references.md"),
    templateFile: toFilePath("template.mustache"),
    showOrphans: false,
    taskDisplay: "none",
    jsonDebugOutput: false,
    ignoreNumericTags: false,
    wiki: true,
    verbose: false,
  };
}

describe("FileAdapter contract and integration", () => {
  it("validates root-relative paths and search patterns", () => {
    expect(toFilePath("folder/note.md")).toBe("folder/note.md");
    expect(toSearchPattern("**/*.md")).toBe("**/*.md");
    expect(toSearchPattern("notes\\{one,two\\}/*.md")).toBe("notes\\{one,two\\}/*.md");
    for (const invalid of ["/absolute.md", "../outside.md", "folder\\note.md", "./note.md"]) {
      expect(() => toFilePath(invalid)).toThrow();
    }
    for (const invalid of ["/**/*.md", "../**/*.md", "folder\\**\\*.md", ""]) {
      expect(() => toSearchPattern(invalid)).toThrow();
    }
  });

  it("applies include and exclude selection with exclusions taking precedence", async () => {
    const memory = new MemoryFileAdapter();
    memory.files.set(toFilePath("notes/one.md"), "one");
    memory.files.set(toFilePath("notes/private/two.md"), "two");
    memory.files.set(toFilePath("notes/three.txt"), "three");
    const files = await memory.listFiles(
      [toSearchPattern("notes/**/*.md")],
      [toSearchPattern("notes/private/**")],
    );
    expect(files).toEqual([toFilePath("notes/one.md")]);
    expect(await memory.listFiles()).toHaveLength(3);
  });

  it("runs indexer with an in-memory adapter and writes its output", async () => {
    const memory = new MemoryFileAdapter();
    memory.files.set(toFilePath("note1.md"), "# Note 1\n\nLink to [[note2]]");
    memory.files.set(toFilePath("note2.md"), "# Note 2\n\nBacklink here");
    memory.files.set(toFilePath("template.mustache"), "Index:\n{{#notes}}\n- {{title}}\n{{/notes}}");

    await indexer(indexOptions(), memory);

    const referencesContent = memory.files.get(toFilePath("references.md"));
    expect(referencesContent).toContain("Note 1");
    expect(referencesContent).toContain("Note 2");
    expect(memory.createdDirs).toEqual(new Set());
  });

  it("runs fixNotes with an in-memory adapter", async () => {
    const memory = new MemoryFileAdapter();
    memory.files.set(toFilePath("note.md"), "# My Note\n[author:: Alice]");
    const options: ZlFixOptions = {
      path: toFilePath(""),
      ignoreDirs: undefined,
      rules: ["inline-properties-to-frontmatter"],
      propertyFilter: undefined,
      verbose: false,
      outputDir: toFilePath(""),
      move: true,
    };

    await fixNotes(options, memory);

    const updatedContent = memory.files.get(toFilePath("note.md"));
    expect(updatedContent).toContain("author:");
    expect(updatedContent).toContain("- Alice");
    expect(updatedContent).not.toContain("[author:: Alice]");
  });

  it("propagates missing-file and write errors to callers", async () => {
    const options = indexOptions();
    const memory = new MemoryFileAdapter();
    memory.files.set(toFilePath("template.mustache"), "Index:");
    const missingFile = Object.assign(new Error("missing note"), { code: "ENOENT" });
    memory.readError = missingFile;
    await expect(indexer(options, memory)).rejects.toBe(missingFile);

    memory.readError = undefined;
    memory.writeError = new Error("write failed");
    await expect(indexer(options, memory)).rejects.toThrow("write failed");

    const fixerMemory = new MemoryFileAdapter();
    fixerMemory.files.set(toFilePath("note.md"), "# Note");
    const fixOptions: ZlFixOptions = {
      path: toFilePath(""),
      rules: ["trailing-newline"],
      outputDir: toFilePath(""),
      move: false,
      verbose: false,
    };
    fixerMemory.readError = missingFile;
    await expect(fixNotes(fixOptions, fixerMemory)).rejects.toBe(missingFile);
    fixerMemory.readError = undefined;
    fixerMemory.writeError = new Error("fix write failed");
    await expect(fixNotes(fixOptions, fixerMemory)).rejects.toThrow("fix write failed");
  });

  it("lists, reads, excludes, and writes files under a configured Node root", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "zettel-lint-adapter-"));
    try {
      await writeFile(path.join(root, "one.md"), "one");
      await writeFile(path.join(root, "skip.md"), "skip");
      const adapter = new NodeFileAdapter(root);
      expect(await adapter.listFiles(
        [toSearchPattern("**/*.md")],
        [toSearchPattern("skip.md")],
      )).toEqual([toFilePath("one.md")]);
      expect(await adapter.readFile(toFilePath("one.md"))).toBe("one");
      await adapter.writeFile(toFilePath("nested/two.md"), "two");
      expect(await readFile(path.join(root, "nested/two.md"), "utf8")).toBe("two");
      await adapter.mkdir(toFilePath("created/child"));
      expect((await stat(path.join(root, "created/child"))).isDirectory()).toBe(true);
      await expect(adapter.readFile(toFilePath("absent.md"))).rejects.toMatchObject({ code: "ENOENT" });
      await expect(adapter.readFile("../outside.md" as FilePath)).rejects.toThrow();
      await expect(adapter.listFiles(["../**/*.md" as SearchPattern])).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects symlinks that resolve outside the configured Node root", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "zettel-lint-root-"));
    const outside = await mkdtemp(path.join(os.tmpdir(), "zettel-lint-outside-"));
    try {
      await writeFile(path.join(outside, "secret.md"), "secret");
      await symlink(path.join(outside, "secret.md"), path.join(root, "escape.md"), "file");
      await symlink(outside, path.join(root, "escape-directory"), "dir");
      const adapter = new NodeFileAdapter(root);
      await expect(adapter.readFile(toFilePath("escape.md"))).rejects.toThrow(/outside the adapter root/);
      await expect(adapter.listFiles([toSearchPattern("**/*.md")])).rejects.toThrow(/outside the adapter root/);
      await expect(adapter.writeFile(toFilePath("escape.md"), "overwritten")).rejects.toThrow(/outside the adapter root/);
      await expect(adapter.mkdir(toFilePath("escape-directory/new"))).rejects.toThrow(/outside the adapter root/);
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });

  it.each([
    ["notes[1]", "notes1"],
    ["notes{one,two}", "notesone"],
    ["notes@(one)", "notesone"],
  ])("treats %s as a literal scan directory in indexing and fixing", async (scanDirectory: string, sibling: string) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "zettel-lint-literal-paths-"));
    try {
      const adapter = new NodeFileAdapter(root);
      const note = toFilePath(`${scanDirectory}/note.md`);
      const dependency = toFilePath(`${scanDirectory}/node_modules/dependency.md`);
      const otherNote = toFilePath(`${sibling}/other.md`);
      const referenceFile = toFilePath(`${scanDirectory}/references[1].md`);
      const similarReference = toFilePath(`${scanDirectory}/references1.md`);
      await adapter.writeFile(note, "# Note");
      await adapter.writeFile(dependency, "# Dependency");
      await adapter.writeFile(otherNote, "# Other");
      await adapter.writeFile(referenceFile, "# Old index");
      await adapter.writeFile(similarReference, "# Similar reference");
      await adapter.writeFile(toFilePath("template.mustache"), "{{#notes}}{{title}}\n{{/notes}}");

      const readSpy = vi.spyOn(adapter, "readFile");
      const references = await indexer({
        ...indexOptions(),
        path: toFilePath(scanDirectory),
        referenceFile,
      }, adapter);
      expect(references.map((reference) => reference.fullpath).sort()).toEqual([note, similarReference].sort());
      expect(readSpy).not.toHaveBeenCalledWith(referenceFile);

      await fixNotes({
        path: toFilePath(scanDirectory),
        outputDir: toFilePath(scanDirectory),
        rules: ["trailing-newline"],
        move: false,
        verbose: false,
      }, adapter);
      expect(await adapter.readFile(note)).toBe("# Note\n");
      expect(await adapter.readFile(dependency)).toBe("# Dependency");
      expect(await adapter.readFile(otherNote)).toBe("# Other");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not expose Node or CLI dependencies through the host-neutral entry point", async () => {
    const api = await import("../../index.js");
    expect(api).toHaveProperty("indexer");
    expect(api).toHaveProperty("fixNotes");
    expect(api).not.toHaveProperty("NodeFileAdapter");
    expect(api).not.toHaveProperty("indexerCommand");
  });
});
