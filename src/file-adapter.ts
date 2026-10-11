import { promises as fs } from "node:fs";
import path from "node:path";
import { glob } from "glob";
import {
  FileAdapter,
  FilePath,
  SearchPattern,
  toFilePath,
  toSearchPattern,
} from "./file-system.js";

export type { FileAdapter, FilePath, SearchPattern } from "./file-system.js";
export { joinFilePath, joinSearchPattern, parentFilePath, toFilePath, toSearchPattern } from "./file-system.js";

function isWithinRoot(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

export class NodeFileAdapter implements FileAdapter {
  private readonly root: string;

  constructor(root: string = process.cwd()) {
    this.root = path.resolve(root);
  }

  async listFiles(include?: SearchPattern[], exclude?: SearchPattern[]): Promise<FilePath[]> {
    const patterns = include?.length ? include : [toSearchPattern("**/*")];
    const included = new Set<string>();
    for (const pattern of patterns) {
      for (const filepath of await glob(toSearchPattern(pattern), { cwd: this.root, nodir: true })) {
        included.add(filepath.split(path.sep).join("/"));
      }
    }

    const excluded = new Set<string>();
    for (const pattern of exclude ?? []) {
      for (const filepath of await glob(toSearchPattern(pattern), { cwd: this.root, nodir: true })) {
        excluded.add(filepath.split(path.sep).join("/"));
      }
    }

    const files: FilePath[] = [];
    for (const filepath of included) {
      if (excluded.has(filepath)) {
        continue;
      }
      const relativePath = toFilePath(filepath);
      const absolutePath = await this.resolveContained(relativePath);
      if ((await fs.stat(absolutePath)).isFile()) {
        files.push(relativePath);
      }
    }
    return files;
  }

  async readFile(filepath: FilePath): Promise<string> {
    return await fs.readFile(await this.resolveContained(filepath), "utf8");
  }

  async writeFile(filepath: FilePath, content: string): Promise<void> {
    const absolutePath = this.absolutePath(filepath);
    const parent = path.dirname(absolutePath);
    await this.resolveContainedPath(parent, true);
    await fs.mkdir(parent, { recursive: true });
    await this.resolveContainedPath(parent);
    await this.resolveContainedPath(absolutePath, true);
    await fs.writeFile(absolutePath, content, "utf8");
  }

  async mkdir(dirpath: FilePath): Promise<void> {
    const absolutePath = this.absolutePath(dirpath);
    await this.resolveContainedPath(absolutePath, true);
    await fs.mkdir(absolutePath, { recursive: true });
    await this.resolveContainedPath(absolutePath);
  }

  private absolutePath(filepath: FilePath): string {
    toFilePath(filepath);
    const absolutePath = path.resolve(this.root, filepath);
    if (!isWithinRoot(this.root, absolutePath)) {
      throw new Error(`Path is outside the adapter root: ${filepath}`);
    }
    return absolutePath;
  }

  private async resolveContained(filepath: FilePath): Promise<string> {
    return await this.resolveContainedPath(this.absolutePath(filepath));
  }

  private async resolveContainedPath(target: string, allowMissing = false): Promise<string> {
    const realRoot = await fs.realpath(this.root);
    let current = target;
    while (true) {
      try {
        const realTarget = await fs.realpath(current);
        if (!isWithinRoot(realRoot, realTarget)) {
          throw new Error(`Resolved path is outside the adapter root: ${target}`);
        }
        return target;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          try {
            if ((await fs.lstat(current)).isSymbolicLink()) {
              throw new Error(`Cannot resolve symlink within the adapter root: ${current}`);
            }
          } catch (lstatError) {
            if ((lstatError as NodeJS.ErrnoException).code !== "ENOENT") {
              throw lstatError;
            }
          }
        }
        if ((error as NodeJS.ErrnoException).code !== "ENOENT" || !allowMissing || current === this.root) {
          throw error;
        }
        current = path.dirname(current);
      }
    }
  }
}

export const defaultFileAdapter = new NodeFileAdapter();
