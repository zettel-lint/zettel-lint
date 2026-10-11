import path from "node:path";
import { FilePath, SearchPattern, toFilePath, toSearchPattern } from "../file-system.js";

function isWithin(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

export function commonPathRoot(directories: string[], files: string[]): string {
  const locations = [
    ...directories.map((directory) => path.resolve(directory)),
    ...files.map((file) => path.dirname(path.resolve(file))),
  ];
  let root = locations[0] ?? process.cwd();
  while (locations.some((location) => !isWithin(root, location))) {
    const parent = path.dirname(root);
    if (parent === root) {
      return root;
    }
    root = parent;
  }
  return root;
}

export function cliPath(value: string, root: string): FilePath {
  const relativePath = path.relative(root, path.resolve(value));
  if (!isWithin(root, path.resolve(value))) {
    throw new Error(`CLI path escapes its configured root: ${value}`);
  }
  return toFilePath(relativePath.split(path.sep).join("/"));
}

export function cliPattern(value: string, root: string): SearchPattern {
  let pattern = value.replaceAll("\\", "/").replace(/^\.\//, "");
  if (path.isAbsolute(value)) {
    pattern = path.relative(root, value).split(path.sep).join("/");
  }
  return toSearchPattern(pattern);
}

export function isSkippableFileError(error: unknown): boolean {
  return error instanceof Error &&
    ((("code" in error) && error.code === "ENOENT") || error.name === "YAMLParseError");
}
