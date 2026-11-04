#!/usr/bin/env node

import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import { Command } from "@commander-js/extra-typings";
import path from "node:path";
import { NodeFileAdapter } from "../file-adapter.js";
import { ConfigurationError, indexer } from "../zl-index-core.js";
import { ZlIndexOptions } from "../core-options.js";
import { cliPath, cliPattern, commonPathRoot, isSkippableFileError } from "./cli-paths.js";

export { collectFromFile, indexer } from "../zl-index-core.js";
export type { ZlIndexOptions } from "../core-options.js";

export interface ZlIndexCommandOptions {
  [key: string]: any;
  path: string;
  ignoreDirs?: string[];
  referenceFile: string;
  createFile: string;
  templateFile: string;
  showOrphans: boolean;
  taskDisplay: "none" | "by-file" | "by-priority";
  jsonDebugOutput: boolean;
  ignoreNumericTags: boolean;
  ignoreQuoted?: boolean;
  wiki: boolean;
  verbose: boolean;
}

function printHeader(program: ZlIndexCommandOptions): void {
  if (program.verbose) {
    clear();
    console.log(chalk.red(figlet.textSync("zettel-lint-index", { horizontalLayout: "full" })));
    console.log("Looking for notes in " + program.path);
    console.log("Ignoring dirs: " + program.ignoreDirs);
    console.log("Outputting references to " + program.referenceFile);
    console.log("Using template file: " + program.templateFile);
    console.log((program.wiki ? "" : "NOT ") + "using [[Wiki-Links]]");
    console.log("Displaying Tasks " + program.taskDisplay);
  }
}

async function runIndexer(program: ZlIndexCommandOptions): Promise<void> {
  printHeader(program);
  try {
    const root = commonPathRoot([program.path], [program.referenceFile, program.createFile, program.templateFile]);
    const adapter = new NodeFileAdapter(root);
    const options: ZlIndexOptions = {
      ...program,
      path: cliPath(program.path, root),
      ignoreDirs: program.ignoreDirs?.map((pattern) => cliPattern(pattern, root, program.path)),
      referenceFile: cliPath(program.referenceFile, root),
      createFile: cliPath(program.createFile, root),
      templateFile: cliPath(program.templateFile, root),
    };
    const references = await indexer(options, adapter, (filepath, error) => {
      console.error(`Error processing file ${filepath}:`, error);
      return isSkippableFileError(error);
    });
    if (program.jsonDebugOutput) {
      references.forEach((reference) => console.log(reference));
    }
    if (program.verbose) {
      console.log("Updated");
    }
  } catch (error) {
    console.error("Error: " + error);
    process.exitCode = error instanceof ConfigurationError ? 1 : 2;
  }
}

export default function indexerCommand(): Command<[], ZlIndexCommandOptions> {
  const idxer = new Command<[], ZlIndexCommandOptions>("index");
  idxer
    .description("Generate index/reference file. Will OVERWRITE any existing files.")
    .alias("create")
    .option("-p, --path <path>", "Root path for search", ".")
    .option("-i, --ignore-dirs <path...>", "Path(s) to ignore")
    .option("-r, --reference-file <path>", "Path to output reference.md", "references.md")
    .option("-c, --create-file <path>", "Path to output file", "references.md")
    .option("-m, --template-file <path>", "Path to input mustache template", path.resolve(import.meta.dirname, "../references.md.mustache"))
    .option("-o, --show-orphans", "Output list of orphaned links to console", false)
    .option("-t, --task-display <format>", "Display tasks? 'none' 'by-file' 'by-priority'", (value): "none" | "by-file" | "by-priority" => {
      if (!["none", "by-file", "by-priority"].includes(value)) {
        throw new Error("Invalid task display format");
      }
      return value as "none" | "by-file" | "by-priority";
    }, "by-file")
    .option("--json-debug-output", "Output JSON intermediate representations", false)
    .option("--ignore-numeric-tags", "Ignore tags that start with a number or are numeric", false)
    .option("--ignore-quoted", "Ignore tasks, links, and tags inside code blocks, quotes, or blockquotes", false)
    .option("--no-wiki", "use [[wiki style]] links", false)
    .option("-v, --verbose", "Additional output", false)
    .action(async (cmdObj) => await runIndexer(cmdObj as ZlIndexCommandOptions));
  return idxer;
}
