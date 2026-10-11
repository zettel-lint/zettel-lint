import { Collector } from "./collectors/Collector.js";
import { ContextCollector } from "./collectors/ContextCollector.js";
import { TagCollector } from "./collectors/TagCollector.js";
import { TaskCollector } from "./collectors/TaskCollector.js";
import { WikiCollector } from "./collectors/WikiCollector.js";
import { collectMatches } from "./collectors/RegexCollector.js";
import { Templator } from "./Templator.js";
import { FileAdapter, FilePath, joinSearchPattern, parentFilePath, toSearchPattern } from "./file-system.js";
import { idFromFilename } from "./file-handling.js";
import { ZlIndexOptions } from "./core-options.js";
import { fileWikiLinks } from "./types.js";

const collectors: Collector[] = [new WikiCollector(), new ContextCollector(), new TagCollector(), new TaskCollector()];

export type FileErrorHandler = (filepath: FilePath, error: unknown) => boolean;

export async function collectFromFile(filename: FilePath, program: ZlIndexOptions, adapter: FileAdapter): Promise<fileWikiLinks> {
  const titleReg = /^(?:title:|#) (.*)$/gm;
  const contents = await adapter.readFile(filename);
  const matchData: { [collector: string]: string[] } = {};
  collectors.forEach((collector) => {
    matchData[collector.dataName] = collector.collector(filename, contents, program);
  });

  const name = filename.split("/").pop();
  const capturedTitle = collectMatches(contents, titleReg)?.[0];
  return {
    id: idFromFilename(filename),
    filename: name,
    fullpath: filename,
    wikiname: name?.slice(0, -3),
    title: capturedTitle?.length > 0 ? capturedTitle : name?.split(".")[0],
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

  const exclude = [
    joinSearchPattern(program.path, "**/node_modules/**"),
    toSearchPattern(program.referenceFile),
    ...(program.ignoreDirs ?? []),
  ];
  const files = await adapter.listFiles(
    [joinSearchPattern(program.path, "**/*.md")],
    exclude,
  );
  const references: fileWikiLinks[] = [];

  for (const filepath of files) {
    try {
      const result = await collectFromFile(filepath, program, adapter);
      if (filepath !== program.referenceFile) {
        references.push(result);
      }
    } catch (error) {
      if (!onFileError?.(filepath, error)) {
        throw error;
      }
    }
  }

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
