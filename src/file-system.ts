declare const filePathBrand: unique symbol;
declare const searchPatternBrand: unique symbol;

export type FilePath = string & { readonly [filePathBrand]: true };
export type SearchPattern = string & { readonly [searchPatternBrand]: true };

export function toFilePath(value: string): FilePath {
  if (
    value.startsWith("/") ||
    /^[A-Za-z]:/.test(value) ||
    value.includes("\\") ||
    value.split("/").some((segment) => segment === "." || segment === ".." || (segment === "" && value !== ""))
  ) {
    throw new Error(`Invalid root-relative path: ${value}`);
  }
  return value as FilePath;
}

export function toSearchPattern(value: string): SearchPattern {
  if (
    value.length === 0 ||
    value.startsWith("/") ||
    /^[A-Za-z]:/.test(value) ||
    value.includes("\\") ||
    value.split("/").some((segment) => segment === "." || segment === ".." || segment === "")
  ) {
    throw new Error(`Invalid root-relative glob pattern: ${value}`);
  }
  return value as SearchPattern;
}

export function joinFilePath(...segments: string[]): FilePath {
  return toFilePath(segments.filter(Boolean).join("/"));
}

export function joinSearchPattern(...segments: string[]): SearchPattern {
  return toSearchPattern(segments.filter(Boolean).join("/"));
}

export function parentFilePath(filepath: FilePath): FilePath {
  const separator = filepath.lastIndexOf("/");
  return toFilePath(separator < 0 ? "" : filepath.slice(0, separator));
}

export interface FileAdapter {
  listFiles(include?: SearchPattern[], exclude?: SearchPattern[]): Promise<FilePath[]>;
  readFile(filepath: FilePath): Promise<string>;
  writeFile(filepath: FilePath, content: string): Promise<void>;
  mkdir?(dirpath: FilePath): Promise<void>;
}
