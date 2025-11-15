#!/usr/bin/env node

import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import { promises as fs } from "fs";
import { Command } from '@commander-js/extra-typings';
import { TaskCollector } from "./collectors/TaskCollector.js";
import { ContextCollector } from "./collectors/ContextCollector.js";
import { TagCollector } from "./collectors/TagCollector.js";
import { WikiCollector } from "./collectors/WikiCollector.js";
import { Collector } from "./collectors/Collector.js";
import { collectMatches } from "./collectors/RegexCollector.js";
import { fileWikiLinks } from "./types.js";
import { idFromFilename } from "./file-handling.js";
import { Templator } from "./Templator.js";
import path from "path";
import { fileURLToPath } from 'url';
import { glob } from "glob";
import { YAMLParseError } from "yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ZlIndexOptions {
  path: string; // Root path for search
  ignoreDirs: string[] | undefined; // Path(s) to ignore
  referenceFile: string; // Path to output reference.md
  createFile: string; // Path to output file
  templateFile: string; // Path to input mustache template
  showOrphans: boolean; // Output list of orphaned links to console
  taskDisplay: 'none' | 'by-file' | 'by-priority'; // Display tasks
  jsonDebugOutput: boolean; // Output JSON intermediate representations
  wiki: boolean; // Use [[wiki style]] links
  verbose: boolean; // Additional output
  // Additional options, required for Command compatibility
  [key: string]: any; // Allow additional options
}


export default function indexerCommand() : Command<[], ZlIndexOptions> {
  const idxer = new Command<[], ZlIndexOptions>('index');
  idxer
    .description("Generate index/reference file. Will OVERWRITE any existing files.")
    .alias("create")
    .option('-p, --path <path>', "Root path for search", ".")
    .option('-i, --ignore-dirs <path...>', "Path(s) to ignore")
    .option('-r, --reference-file <path>', "Path to output reference.md", "references.md")
    .option('-c, --create-file <path>', "Path to output file", "references.md")
    .option('-m, --template-file <path>', "Path to input mustache template", path.resolve(__dirname, "references.md.mustache"))
    .option('-o, --show-orphans', "Output list of orphaned links to console", false)
    .option('-t, --task-display <format>', "Display tasks? 'none' 'by-file' 'by-priority'", (value): 'none' | 'by-file' | 'by-priority' => {
      if (!['none', 'by-file', 'by-priority'].includes(value)) {
        throw new Error("Invalid task display format");
      }
      return value as 'none' | 'by-file' | 'by-priority';
    }, "by-file")
    .option('--json-debug-output', "Output JSON intermediate representations", false)
    .option('--no-wiki', "use [[wiki style]] links", false)
    .option('-v, --verbose', "Additional output", false)
    .action(async (cmdObj: ZlIndexOptions) => { await indexer(cmdObj) })
  return idxer;
}

function printHeader(program: ZlIndexOptions): void {
  if (program.verbose) {
    clear();
    console.log(
      chalk.red(
        figlet.textSync('zettel-lint-index', { horizontalLayout: 'full' })
      )
    );
    console.log("Looking for notes in " + program.path);
    console.log("Ignoring dirs: " + program.ignoreDirs);
    console.log("Outputting references to " + program.referenceFile);
    console.log("Using template file: " + program.templateFile)
    console.log((program.wiki ? "" : "NOT ") + "using [[Wiki-Links]]");
    console.log("Displaying Tasks " + program.taskDisplay);
  }
}


const collectors: Collector[] = [new WikiCollector, new ContextCollector, new TagCollector, new TaskCollector];

export async function collectFromFile(filename: string, program: ZlIndexOptions): Promise<fileWikiLinks> {
  const titleReg = /^(?:title:|#) (.*)$/gm; // Without the global, the parser stack overflows

  const contents = await fs.readFile(filename, "utf8");

  var matchData: {[collector: string]: string[]} = {}
  collectors.forEach(element => {
    matchData[element.dataName] = element.collector(filename, contents, program);
  });

  const name = filename.split("/").pop();
  const capturedTitle = collectMatches(contents, titleReg)?.[0];

  return {
    id: idFromFilename(filename),
    filename: name,
    fullpath: filename,
    wikiname: name?.slice(0,-3), // .md
    title: capturedTitle?.length > 0 ? capturedTitle : name?.split(".")[0],
    matchData
  };
}

/**
 * Run the indexing process: scan Markdown files, collect metadata, render a references file from a template, and write the output.
 *
 * This function:
 * - Prints a verbose header when requested.
 * - Builds an ignore list (includes node_modules and any user-specified ignores).
 * - Recursively finds `.md` files under `program.path`, invokes collectors on each file, and accumulates their results.
 * - Continues processing other files if a per-file error occurs, logging the error; file-not-found errors (ENOENT) are ignored, other errors are propagated.
 * - If both `referenceFile` and `templateFile` are provided, ensures the reference file directory exists, renders the template with collected references, and writes the result to `referenceFile`.
 * - Exits the process with code 1 when required output/template inputs are missing, or with code 2 when the overall parsing/rendering fails.
 *
 * @param program - Indexer options controlling paths, ignores, output/template locations, debug/verbose flags, and task/wiki behavior.
 */
function indexer(program: ZlIndexOptions): void {
  printHeader(program);

  var ignoreList = [program.path + "/**/node_modules/**", program.referenceFile]
  if (program.ignoreDirs) {
    ignoreList = ignoreList.concat(program.ignoreDirs);
  }


  async function parseFiles() {
    var references: fileWikiLinks[] = [];

    // options is optional
    const files = await glob(program.path + "/**/*.md", { ignore: ignoreList });

    for await (const file of files) {
      try {
        const wikiLinks = await collectFromFile(file, program);
        if (program.referenceFile && wikiLinks.filename && !program.referenceFile.endsWith(wikiLinks.filename)) {
          references.push(wikiLinks);
        }
        if (program.jsonDebugOutput) {
          console.log(wikiLinks);
        }
      } catch (error: any) {
        // Only rethrow if not ENOENT or YAMLParseError
        console.error(`Error processing file ${file}:`, error);
        if (error.code !== 'ENOENT' && !(error instanceof YAMLParseError)) {
          throw error;
        }
      }
    }

    if (program.referenceFile && program.templateFile) {
      // Ensure the directory for the reference file exists
      const refDir = path.dirname(program.referenceFile);
      await fs.mkdir(refDir, { recursive: true });

      const template = await fs.readFile(program.templateFile, "utf8");
      const templator = new Templator(references, collectors);
      if (program.verbose) {
        console.log(templator.enhance(template));
      }
      const formatted = templator.render(template);

      await fs.writeFile(program.referenceFile, formatted);
    } else {
      console.error("No output or template file found. Exiting.");
      process.exitCode = 1;
    }
  }

  parseFiles().then(
    () => { if (program.verbose) { console.log("Updated") } },
    (reason) => { console.error("Error: " + reason); process.exitCode = 2; }
  )
}