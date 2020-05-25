#!/usr/bin/env node

import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import path from "path";
import program from "commander";
import {promise as glob} from "glob-promise";
import SimpleMarkdown from "simple-markdown";
import {promises as fs} from "fs";
import { Stream } from "stream";

program
  .version('0.9.0')
  .description("A linter/compiler for Zettel markdown repositories")
  .option('-d, --daily', "Create daily entry if it doesn't exist")
  .option('-p, --path <path>', "Root path for search", ".")
  .option('-i, --ignore-dirs <path>', "Path(s) to ignore")
  .option('-r, --reference-file <path>', "Path to output reference.md")
  .option('-o, --show-orphans', "Output list of orphaned links to console")
  .option('--no-wiki', "use [[wiki style]] links")
  .option('-v, --verbose', "Verbose")
  ;

program
  .parse(process.argv);

if (program.verbose) {
  clear();
  console.log(
      chalk.red(
        figlet.textSync('zettel-lint', { horizontalLayout: 'full' })
      )
    );
  console.log("Looking for notes in " + program.path);
  console.log((program.daily ? "" : "NOT ") + "creating dailies");
  console.log("Ignoring dirs: " + program.ignoreDirs);
  console.log("Outputting references to " + program.referenceFile)
}

async function readMarkdown(filename: string) {
  const markdownContent = await fs.readFile(filename).toString();
  console.log(filename, SimpleMarkdown.defaultBlockParse(markdownContent));
}

function idFromFilename(filename: string) {
  const nameOnly = filename.split("/").pop();
  const withoutExt = nameOnly?.split(".")[0];
  return withoutExt?.split("-")[0];
}

class fileWikiLinks {
  id: string | undefined;
  filename: string | undefined;
  matches: string[] = [];
  orphans: string[] = [];
}

async function readWikiLinks(filename: string, outfile?: fs.FileHandle | undefined) : Promise<fileWikiLinks> {
  const wikiLink = /\[\d{8,14}\]/g;
  const brokenWikiLink = /\[[a-zA-Z0-9\[]+[a-zA-Z ]+.*\][^\(]/g;
  const contents = await fs.readFile(filename, "utf8");
  var matches : string[] = [];
  var orphans : string[] = [];
  var next : RegExpExecArray | null;
  do {
    next = wikiLink.exec(contents);
    if (next) {
      matches.push(next?.toString());
    }
  } while (next);
  do {
    next = brokenWikiLink.exec(contents);
    if (next) {
      orphans.push(next?.toString());
    }
  } while (next);
  return {
    id : idFromFilename(filename),
    filename : filename.split("/").pop(),
    matches,
    orphans
  };
}

var ignoreList = [program.path + "/**/node_modules/**"]
if (program.ignoreDirs) {
  ignoreList.push(program.ignoreDirs);
}

async function parseFiles() {
  var references : fileWikiLinks[] = [];

  // options is optional
  const files = await glob(program.path + "/**/*.md", {ignore: ignoreList});

  for await (const file of files) {
    const wikiLinks = await readWikiLinks(file);
    if (program.referenceFile && !program.referenceFile.endsWith(wikiLinks.filename)) {
      references.push(wikiLinks);
    }
    if (program.verbose) {
      console.log(wikiLinks);
    }
    if (program.showOrphans && wikiLinks.orphans.length > 0) {
      console.log(wikiLinks.filename + " (orphans) : " + wikiLinks.orphans);
    }
  };

  if (program.referenceFile) {
    const formattedReferences = "# References\n\n" + references.map(r => "* " + r.id + " = " + r.filename + ":" + r.matches).join("\n");
    console.log("references :" + formattedReferences);
    fs.writeFile(program.referenceFile, formattedReferences);
  };
};

parseFiles().then(
  () => console.log("Updated"),
  () => console.log("Error")
)
