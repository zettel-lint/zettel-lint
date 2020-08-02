#!/usr/bin/env node

import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import program from "commander";
import indexerCommand from "./zl-index";
import importerCommand from "./zl-import";

program
  .version('0.9.8')
  .description("A linter/compiler for Zettel markdown repositories")
  .command("cron <cron-mode-args>", "Create daily entry if it doesn't exist")
  ;
program.addCommand(indexerCommand());
program.addCommand(importerCommand());
program
  .parse(process.argv);

if (program.verbose) {
  clear();
  console.log(
      chalk.red(
        figlet.textSync('zettel-lint', { horizontalLayout: 'full' })
      )
    );
  
}