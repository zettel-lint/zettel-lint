import { describe, it, expect } from "vitest";
import { FileAdapter, NodeFileAdapter, defaultFileAdapter } from "../../file-adapter.js";
import { indexer, ZlIndexOptions } from "../../zl-index.js";
import { fixNotes, ZlFixOptions } from "../../zl-fix.js";

class MemoryFileAdapter implements FileAdapter {
  public files: Map<string, string> = new Map();
  public createdDirs: Set<string> = new Set();

  async listFiles(pattern: string, ignorePatterns?: string[]): Promise<string[]> {
    return Array.from(this.files.keys()).filter((filePath) => {
      if (ignorePatterns && ignorePatterns.some((ig) => filePath.includes(ig))) {
        return false;
      }
      return filePath.endsWith(".md");
    });
  }

  async readFile(filepath: string): Promise<string> {
    if (this.files.has(filepath)) {
      return this.files.get(filepath)!;
    }
    const error: any = new Error(`File not found: ${filepath}`);
    error.code = "ENOENT";
    throw error;
  }

  async writeFile(filepath: string, content: string): Promise<void> {
    this.files.set(filepath, content);
  }

  async mkdir(dirpath: string): Promise<void> {
    this.createdDirs.add(dirpath);
  }
}

describe("FileAdapter & Virtual Storage Integration", () => {
  it("defaultFileAdapter is instance of NodeFileAdapter", () => {
    expect(defaultFileAdapter).toBeInstanceOf(NodeFileAdapter);
  });

  it("indexer works with a custom in-memory FileAdapter without touching disk", async () => {
    const memory = new MemoryFileAdapter();
    memory.files.set("vault/note1.md", "# Note 1\n\nLink to [[note2]]");
    memory.files.set("vault/note2.md", "# Note 2\n\nBacklink here");
    memory.files.set("vault/template.mustache", "Index:\n{{#notes}}\n- {{title}}\n{{/notes}}");

    const options: ZlIndexOptions = {
      path: "vault",
      ignoreDirs: undefined,
      referenceFile: "vault/references.md",
      createFile: "vault/references.md",
      templateFile: "vault/template.mustache",
      showOrphans: false,
      taskDisplay: "none",
      jsonDebugOutput: false,
      ignoreNumericTags: false,
      wiki: true,
      verbose: false,
    };

    await indexer(options, memory);

    expect(memory.files.has("vault/references.md")).toBe(true);
    const referencesContent = memory.files.get("vault/references.md")!;
    expect(referencesContent).toContain("Note 1");
    expect(referencesContent).toContain("Note 2");
  });

  it("fixNotes works with a custom in-memory FileAdapter", async () => {
    const memory = new MemoryFileAdapter();
    memory.files.set("vault/note.md", "# My Note\n[author:: Alice]");

    const options: ZlFixOptions = {
      path: "vault",
      ignoreDirs: undefined,
      rules: ["inline-properties-to-frontmatter"],
      propertyFilter: undefined,
      verbose: false,
      outputDir: "vault",
      move: true,
    };

    await fixNotes(options, memory);

    const updatedContent = memory.files.get("vault/note.md")!;
    expect(updatedContent).toContain("author:");
    expect(updatedContent).toContain("- Alice");
    expect(updatedContent).not.toContain("[author:: Alice]");
  });
});
