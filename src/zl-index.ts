#!/usr/bin/env node

import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import { promise as glob } from "glob-promise";
import { promises as fs } from "fs";
import commander from "commander";
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

export default function indexerCommand() {
  const idxer = new commander.Command('index');
  idxer
    .description("Generate index/reference file")
    .option('-p, --path <path>', "Root path for search", ".")
    .option('-i, --ignore-dirs <path>', "Path(s) to ignore")
    .option('-r, --reference-file <path>', "Path to output reference.md", "references.md")
    .option('-m, --template-file <path>', "Path to input mustache template", "references.md.mustache")
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
    console.log((program.wiki ? "" : "NOT ") + "using [[Wiki-Links]]");
    console.log("Displaying Tasks " + program.taskDisplay)
  }
}


const collectors: Collector[] = [new WikiCollector, new OrphanCollector, new ContextCollector, new TagCollector, new TaskCollector];

async function collectFromFile(filename: string, program: any): Promise<fileWikiLinks> {
  const titleReg = /^title: (.*)$/gm;

  const contents = await fs.readFile(filename, "utf8");

  var matchData: {[collector: string]: string[]} = {}
  collectors.forEach(element => {
    matchData[element.dataName] = element.collector(filename, contents, program);
  });

  const name = filename.split("/").pop();
  const capturedTitle = collectMatches(contents, titleReg).join();

  return {
    id: idFromFilename(filename),
    filename: name,
    fullpath: filename,
    title: capturedTitle.length > 0 ? capturedTitle : name?.split(".")[0],
    matchData
  };
}

function indexer(program: any): void {
  printHeader(program);

  var ignoreList = [program.path + "/**/node_modules/**", program.referenceFile]
  if (program.ignoreDirs) {
    ignoreList.push(program.ignoreDirs);
  }

  function escapeTitle(title: string) : string {
    return title.replace("(", "{").replace(")", "}");
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
      const formatted = templator.render(template)

      await fs.writeFile(program.referenceFile, formatted);
    };
  };

  parseFiles().then(
    () => console.log("Updated"),
    () => console.log("Error")
  )
}