import type { Collector } from "./collectors/Collector.js";
import { ContextCollector } from "./collectors/ContextCollector.js";
import { TagCollector } from "./collectors/TagCollector.js";
import { TaskCollector } from "./collectors/TaskCollector.js";
import { WikiCollector } from "./collectors/WikiCollector.js";
import { collectMatches } from "./collectors/RegexCollector.js";
import { Templator } from "./Templator.js";
import { escapeGlobPath, FileAdapter, FilePath, joinSearchPattern, parentFilePath, toSearchPattern } from "./file-system.js";
import { idFromFilename } from "./file-handling.js";
import { ZlIndexOptions } from "./core-options.js";
import type { fileWikiLinks } from "./types.js";

const collectors: Collector[] = [new WikiCollector(), new ContextCollector(), new TagCollector(), new TaskCollector()];

export type FileErrorHandler = (filepath: FilePath, error: unknown) => boolean;

// Performance optimization: Module-scoped non-global regex stops scanning at first title match,
// avoiding per-file RegExp allocations and unnecessary full-document scans.
const TITLE_REGEX = /^(?:title:|#) (.*)$/m;

export async function collectFromFile(filename: FilePath, program: ZlIndexOptions, adapter: FileAdapter): Promise<fileWikiLinks> {
  const contents = await adapter.readFile(filename);
  const matchData: { [collector: string]: string[] } = {};
  // Performance optimization: Use indexed loop to eliminate callback allocation per file
  for (let i = 0; i < collectors.length; i++) {
    const collector = collectors[i];
    matchData[collector.dataName] = collector.collector(filename, contents, program);
  }

  // Performance optimization: Use lastIndexOf/slice instead of .split() array allocations
  const lastSlash = Math.max(filename.lastIndexOf("/"), filename.lastIndexOf("\\"));
  const name = lastSlash !== -1 ? filename.slice(lastSlash + 1) : filename;

  const match = TITLE_REGEX.exec(contents);
  const capturedTitle = match ? match[1].trim() : undefined;

  const lastDot = name.lastIndexOf(".");
  const fallbackTitle = lastDot !== -1 ? name.slice(0, lastDot) : name;

  return {
    id: idFromFilename(filename),
    filename: name,
    fullpath: filename,
    wikiname: name ? name.slice(0, -3) : name,
    title: capturedTitle && capturedTitle.length > 0 ? capturedTitle : fallbackTitle,
    matchData,
  };
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export async function indexer(
  program: ZlIndexOptions,
  adapter: FileAdapter,
  onFileError?: FileErrorHandler,
): Promise<fileWikiLinks[]> {
  if (!program.referenceFile || !program.templateFile) {
    throw new ConfigurationError("No output or template file found");
  }

  const pathPattern = escapeGlobPath(program.path);
  const exclude = [
    joinSearchPattern(pathPattern, "**/node_modules/**"),
    toSearchPattern(escapeGlobPath(program.referenceFile)),
    ...(program.ignoreDirs ?? []),
  ];
  const files = await adapter.listFiles(
    [joinSearchPattern(pathPattern, "**/*.md")],
    exclude,
  );
  // Bound concurrent reads while keeping results in discovery order.
  const fileConcurrency = 16;
  const fileResults: (fileWikiLinks | null)[] = [];
  for (let offset = 0; offset < files.length; offset += fileConcurrency) {
    const batchResults = await Promise.all(
      files.slice(offset, offset + fileConcurrency).map(async (filepath) => {
        try {
          const result = await collectFromFile(filepath, program, adapter);
          if (filepath !== program.referenceFile) {
            return result;
          }
        } catch (error) {
          if (!onFileError?.(filepath, error)) {
            throw error;
          }
        }
        return null;
      }),
    );
    fileResults.push(...batchResults);
  }
  const references = fileResults.filter((result): result is fileWikiLinks => result !== null);

  const template = await adapter.readFile(program.templateFile);
  const templator = new Templator(references, collectors);
  const formatted = templator.render(template);
  const refDir = parentFilePath(program.referenceFile);
  if (refDir && adapter.mkdir) {
    await adapter.mkdir(refDir);
  }
  await adapter.writeFile(program.referenceFile, formatted);
  return references;
}
