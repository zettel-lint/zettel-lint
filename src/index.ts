#!/usr/bin/env node

import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import path from "path";
import program from "commander";
import glob from "glob";
import SimpleMarkdown from "simple-markdown";
import fs from "fs";

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
  .option('-r, --root', "Root path for search", "bob");

program
  .parse(process.argv);

const root = program.root ? program.root : ".";

console.log("Looking for notes in " + root);
console.log((program.daily ? "" : "NOT ") + "creating dailies");

// options is optional
glob(root + "/**/*.md", {ignore: root + "/**/node_modules/**"}, function (er, files) {
    // files is an array of filenames.
    // If the `nonull` option is set, and nothing
    // was found, then files is ["**/*.js"]
    // er is an error object or null.
    files.forEach(file => {
        // TODO : switch to async/await
        const markdownContent = fs.readFileSync(file).toString();
        console.log(file, SimpleMarkdown.defaultBlockParse(markdownContent));        
    });
})