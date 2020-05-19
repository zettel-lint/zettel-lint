#!/usr/bin/env node

import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import path from "path";
import program from "commander";
import glob from "glob";
import SimpleMarkdown from "simple-markdown";
import {promises as fs} from "fs";

clear();
console.log(
    chalk.red(
      figlet.textSync('zettel-lint', { horizontalLayout: 'full' })
    )
  );

program
  .version('0.9.0')
  .description("A linter/compiler for Zettel markdown repositories")
  .option('-d, --daily', "Create daily entry if it doesn't exist")
  .option('-r, --root <path>', "Root path for search", ".")
  .option('--no-wiki', "use [[wiki style]] links")
  ;

program
  .parse(process.argv);

console.log("Looking for notes in " + program.root);
console.log((program.daily ? "" : "NOT ") + "creating dailies");

async function readMarkdown(filename: string) {
  const markdownContent = await fs.readFile(filename).toString();
  console.log(filename, SimpleMarkdown.defaultBlockParse(markdownContent));
}

function idFromFilename(filename: string) {
  const nameOnly = filename.split("/").pop();
  const withoutExt = nameOnly?.split(".")[0];
  return withoutExt?.split("-")[0];
}

async function readWikiLinks(filename: string) {
  const wikiLink = /\[\d{8,14}\]/g;
  const contents = await fs.readFile(filename, "utf8");
  var matches = [];
  var next : RegExpExecArray | null;
  do {
    next = wikiLink.exec(contents);
    matches.push(next);
  } while (next);
  console.log(idFromFilename(filename) +  " = " + filename + ":" + matches);
}

// options is optional
glob(program.root + "/**/*.md", {ignore: program.root + "/**/node_modules/**"}, async function (er, files) {
    // files is an array of filenames.
    // If the `nonull` option is set, and nothing
    // was found, then files is ["**/*.js"]
    // er is an error object or null.
    for await (const file of files) {
      await readWikiLinks(file)
    };
})