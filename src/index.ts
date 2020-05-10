#!/usr/bin/env node

import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import path from "path";
import program from "commander";

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
  .parse(process.argv);

if (!process.argv.slice(2).length) {
   program.outputHelp();
}