#!/usr/bin/env node

import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import program from "commander";
import indexerCommand from "./zl-index";
import importerCommand from "./zl-import";
import notesCommand from "./zl-notes";
import {version as packageVersion} from "../package.json";

export const version = packageVersion;

program
  .version(version)
  .description("A linter/compiler for Zettel markdown repositories")
  ;
console.log(`zettel-lint (v${version}). See LICENCE for copyright details.`)

program.addCommand(indexerCommand());
program.addCommand(importerCommand());
program.addCommand(notesCommand());
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