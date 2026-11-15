# File adapter and programmatic API

The package root (`zettel-lint`) exports host-neutral indexing and fixing functions. It does not import Node filesystem APIs or CLI dependencies. A host provides a `FileAdapter` implementation when it calls `indexer`, `collectFromFile`, or `fixNotes`.

## Paths and file selection

`FilePath` and `SearchPattern` are branded strings validated by `toFilePath` and `toSearchPattern`. Paths are normalized, root-relative and use `/`; an empty `FilePath` denotes the adapter root. Absolute paths, backslashes, `.` and `..` path segments are invalid. Search patterns use root-relative glob syntax and may contain glob metacharacters; they also permit `\{` and `\}` to match literal braces. Other backslashes remain invalid.

`listFiles(include, exclude)` returns root-relative paths. An omitted or empty include list imposes no include restriction; otherwise a result must match at least one include pattern. Exclusions take precedence and a result matching any exclude pattern is omitted. Patterns use the same glob syntax as `SearchPattern`.

`readFile` reads UTF-8 text and rejects on failure, including when the file is missing. `writeFile` creates or replaces the target file and rejects on failure. When supplied, `mkdir` is called by the core before writing into a nested directory. If an adapter omits `mkdir`, its `writeFile` must ensure any required parent directories exist. File and adapter errors reject the programmatic operation unless the caller explicitly supplies an `onFileError` handler that elects to skip that file. The CLI preserves its historical skip-and-report behavior for missing files and YAML parse errors.

Indexing and fixing options (`ZlIndexOptions`, `ZlFixOptions`) use `FilePath` for roots and file destinations and `SearchPattern[]` for exclusions. The root of these paths is the adapter’s root, not the process working directory. Core operations always require the adapter as an argument, so importing the package root does not select or load a host-specific filesystem implementation.

## In-memory adapter example

This example uses `minimatch` for glob matching; install it with `npm install minimatch`.

```ts
import { minimatch } from "minimatch";
import {
  indexer,
  toFilePath,
  toSearchPattern,
} from "zettel-lint";
import type { FileAdapter, FilePath, SearchPattern } from "zettel-lint";

class MemoryAdapter implements FileAdapter {
  readonly files = new Map<FilePath, string>();

  async listFiles(include: SearchPattern[] = [], exclude: SearchPattern[] = []): Promise<FilePath[]> {
    return [...this.files.keys()].filter((file) =>
      (!include.length || include.some((pattern) => minimatch(file, pattern))) &&
      !exclude.some((pattern) => minimatch(file, pattern)),
    );
  }

  async readFile(filepath: FilePath): Promise<string> {
    const content = this.files.get(filepath);
    if (content === undefined) {
      throw new Error(`File not found: ${filepath}`);
    }
    return content;
  }

  async writeFile(filepath: FilePath, content: string): Promise<void> {
    this.files.set(filepath, content);
  }
}

const adapter = new MemoryAdapter();
adapter.files.set(toFilePath("note.md"), "# Example note");
adapter.files.set(toFilePath("template.mustache"), "{{#notes}}{{title}}{{/notes}}");

await indexer(
  {
    path: toFilePath(""),
    referenceFile: toFilePath("references.md"),
    createFile: toFilePath("references.md"),
    templateFile: toFilePath("template.mustache"),
    ignoreDirs: [toSearchPattern("**/node_modules/**")],
    showOrphans: false,
    taskDisplay: "none",
    jsonDebugOutput: false,
    ignoreNumericTags: false,
    wiki: true,
    verbose: false,
  },
  adapter,
);
```

## Node adapter

Node-specific support is available from `zettel-lint/node`. Construct a `NodeFileAdapter` with the filesystem directory that defines its boundary:

```ts
import { NodeFileAdapter } from "zettel-lint/node";

const adapter = new NodeFileAdapter("/path/to/vault");
```

The adapter uses `glob` and UTF-8 Node filesystem operations. It resolves and checks paths against the configured root for listing, reading, writing and directory creation, including results reached through symlinks. An operation whose resolved path escapes the root rejects. The CLI derives a common adapter root from the scan and output/template paths, then converts each command path to a root-relative path.
