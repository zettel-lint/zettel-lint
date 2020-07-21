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

export default function indexerCommand() {
  const idxer = new commander.Command('index');
  idxer
    .description("Generate index/reference file")
    .option('-p, --path <path>', "Root path for search", ".")
    .option('-i, --ignore-dirs <path>', "Path(s) to ignore")
    .option('-r, --reference-file <path>', "Path to output reference.md")
    .option('-o, --show-orphans', "Output list of orphaned links to console")
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
    console.log("Outputting references to " + program.referenceFile)
  }
}

function idFromFilename(filename: string) {
  const nameOnly = filename.split("/").pop();
  const withoutExt = nameOnly?.split(".")[0];
  return withoutExt?.split("-")[0];
}

const collectors: Collector[] = [new WikiCollector, new OrphanCollector, new ContextCollector, new TagCollector, new TaskCollector];

async function collectFromFile(filename: string): Promise<fileWikiLinks> {
  const titleReg = /^title: (.*)$/gm;

  const contents = await fs.readFile(filename, "utf8");

  var matchData: {[collector: string]: string[]} = {}
  collectors.forEach(element => {
    matchData[element.dataName] = element.collect(contents);
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

  var ignoreList = [program.path + "/**/node_modules/**"]
  if (program.ignoreDirs) {
    ignoreList.push(program.ignoreDirs);
  }

  async function parseFiles() {
    var references: fileWikiLinks[] = [];

    // options is optional
    const files = await glob(program.path + "/**/*.md", { ignore: ignoreList });

    for await (const file of files) {
      const wikiLinks = await collectFromFile(file);
      if (program.referenceFile && !program.referenceFile.endsWith(wikiLinks.filename)) {
        references.push(wikiLinks);
      }
      if (program.jsonDebugOutput) {
        console.log(wikiLinks);
      }
    };

    if (program.referenceFile) {
      const header = "---" +
        "\ncreated: " + (new Date()).toISOString() +
        "\nmodified: " + (new Date()).toISOString() +
        "\ntitle: References" +
        "\n---" +
        "\n\n# References" +
        "\n\n";

      const formattedReferences = header +
        collectors
          .filter(c => program.showOrphans || c.dataName !== "orphans")
          .map(c => c.formatter(references)).join("\n\n") +
        "\n\n## References\n\n" +
        references.map(r => "[" + r.id + "]: ./" + r.filename + (r.title ? " (" + r.title + ")" : "")).join("\n")
        ;

      if (program.jsonDebugOutput) {
        console.log("references :" + formattedReferences);
      }
      await fs.writeFile(program.referenceFile, formattedReferences);
    };
  };

  parseFiles().then(
    () => console.log("Updated"),
    () => console.log("Error")
  )
}