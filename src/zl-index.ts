#!/usr/bin/env node

import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import { promises as fs } from "fs";
import * as commander from "commander";
import { TaskCollector } from "./TaskCollector";
import { ContextCollector } from "./ContextCollector";
import { TagCollector } from "./TagCollector";
import { OrphanCollector } from "./OrphanCollector";
import { WikiCollector } from "./WikiCollector";
import { Collector } from "./Collector";
import { collectMatches } from "./RegexCollector";
import { fileWikiLinks } from "./types";
import { idFromFilename } from "./file-handling";
import { Templator } from "./Templator";
import path from "path";
import { exit } from "process";
import { fileURLToPath } from 'url';
import { glob } from "glob";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function indexerCommand() {
  const idxer = new commander.Command('index');
  idxer
    .description("Generate index/reference file. Will OVERWRITE any exiting files.")
    .alias("create")
    .option('-p, --path <path>', "Root path for search", ".")
    .option('-i, --ignore-dirs <path...>', "Path(s) to ignore")
    .option('-r, --reference-file <path>', "Path to output reference.md", "references.md")
    .option('-c, --create-file <path>', "Path to output file", "references.md")
    .option('-m, --template-file <path>', "Path to input mustache template", path.resolve(__dirname, "references.md.mustache"))
    .option('-o, --show-orphans', "Output list of orphaned links to console")
    .option('-t, --task-display <format>', "Display tasks? 'none' 'by-file' 'by-priority'", "by-file")
    .option('--json-debug-output', "Output JSON intermediate representations")
    .option('--no-wiki', "use [[wiki style]] links")
    .option('-v, --verbose', "Additional output")
    .action((cmdObj) => { indexer(cmdObj) })
  return idxer;
}

function printHeader(program: any): void {
  if (program.verbose) {
    clear();
    console.log(
      chalk.red(
        figlet.textSync('zettel-lint-index', { horizontalLayout: 'full' })
      )
    );
    console.log("Looking for notes in " + program.path);
    console.log((program.daily ? "" : "NOT ") + "creating dailies");
    console.log("Ignoring dirs: " + program.ignoreDirs);
    console.log("Outputting references to " + program.referenceFile);
    console.log("Using template file: " + program.templateFile)
    console.log((program.wiki ? "" : "NOT ") + "using [[Wiki-Links]]");
    console.log("Displaying Tasks " + program.taskDisplay);
    if (program.args.length > 0) {
      console.log("Additional arguments: " + program.args);
    }
  }
}


const collectors: Collector[] = [new WikiCollector, new OrphanCollector, new ContextCollector, new TagCollector, new TaskCollector];

export async function collectFromFile(filename: string, program: any): Promise<fileWikiLinks> {
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

function indexer(program: any): void {
  printHeader(program);

  var ignoreList = [program.path + "/**/node_modules/**", program.referenceFile]
  if (program.ignoreDirs) {
    ignoreList.concat(program.ignoreDirs);
  }

  async function parseFiles() {
    var references: fileWikiLinks[] = [];

    // options is optional
    const files = await glob(program.path + "/**/*.md", { ignore: ignoreList });

    for await (const file of files) {
      const wikiLinks = await collectFromFile(file, program);
      if (program.referenceFile && !program.referenceFile.endsWith(wikiLinks.filename)) {
        references.push(wikiLinks);
      }
      if (program.jsonDebugOutput) {
        console.log(wikiLinks);
      }
    };

    if (program.referenceFile && program.templateFile) { 
      const template = await fs.readFile(program.templateFile, "utf8");
      const templator = new Templator(references, collectors);
      if(program.verbose) {
        console.log(templator.enhance(template));
      }
      const formatted = templator.render(template)

      await fs.writeFile(program.referenceFile, formatted);
    } else {
      console.error("No output or template file found. Exiting.");
      exit(1);
    }
  };

  parseFiles().then(
    () => { if (program.verbose) { console.log("Updated") } },
    (reason) => { console.error("Error: " + reason); exit(2); }
  )
}