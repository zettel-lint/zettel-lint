#!/usr/bin/env node

import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import path from "path";
import program from "commander";
import glob from "glob";
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



async function readWikiLinks(filename: string, outfile?: fs.FileHandle | undefined) {
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
  var outputStream: fs.FileHandle | undefined;

  if (program.outputFile) {
    outputStream = await fs.open(program.outputFile, "w");
  }

  // options is optional
  glob(program.path + "/**/*.md", {ignore: ignoreList}, async function (er, files) {
      // files is an array of filenames.
      // If the `nonull` option is set, and nothing
      // was found, then files is ["**/*.js"]
      // er is an error object or null.
      for await (const file of files) {
        const wikiLinks = await readWikiLinks(file, outputStream)
        if (program.verbose) {
          console.log(wikiLinks);
        }
        if (program.showOrphans && wikiLinks.orphans.length > 0) {
          console.log(wikiLinks.filename + " (orphans) : " + wikiLinks.orphans);
        }
        outputStream?.appendFile(wikiLinks);
      };
  })

  if (outputStream) {
    outputStream.close();
  }
}

parseFiles().then(
  () => console.log("Updated"),
  () => console.log("Error")
)
