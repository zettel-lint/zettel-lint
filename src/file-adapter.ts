import { promises as fs } from "fs";
import path from "path";
import { glob } from "glob";

/**
 * Interface representing a file system abstraction for reading, writing, and querying files.
 * This allows `zettel-lint` core logic to operate consistently across CLI (Node `fs`),
 * Obsidian Vault API, VS Code workspace file system, or in-memory virtual file systems.
 */
export interface FileAdapter {
  /**
   * List files matching a root path/pattern, with optional ignore patterns.
   */
  listFiles(pattern: string, ignorePatterns?: string[]): Promise<string[]>;

  /**
   * Read the UTF-8 text content of a file.
   */
  readFile(filepath: string): Promise<string>;

  /**
   * Write UTF-8 text content to a file.
   */
  writeFile(filepath: string, content: string): Promise<void>;

  /**
   * Ensure a directory path exists.
   */
  mkdir(dirpath: string): Promise<void>;
}

/**
 * Default Node.js implementation of `FileAdapter` using standard `node:fs` and `glob`.
 */
export class NodeFileAdapter implements FileAdapter {
  async listFiles(pattern: string, ignorePatterns?: string[]): Promise<string[]> {
    return await glob(pattern, { ignore: ignorePatterns });
  }

  async readFile(filepath: string): Promise<string> {
    return await fs.readFile(filepath, "utf8");
  }

  async writeFile(filepath: string, content: string): Promise<void> {
    const dir = path.dirname(filepath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filepath, content, "utf8");
  }

  async mkdir(dirpath: string): Promise<void> {
    await fs.mkdir(dirpath, { recursive: true });
  }
}

export const defaultFileAdapter = new NodeFileAdapter();
