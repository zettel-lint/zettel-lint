#!/usr/bin/env node

import clear from "clear";
import figlet from "figlet";
import * as commander from "commander";
import indexerCommand from "./zl-index";
import importerCommand from "./zl-import";
import notesCommand from "./zl-notes";
import chalk from "chalk";
// THIS import is outside `src/` folder so fails the build
// import {version as packageVersion} from "../package.json";

export const version = "0.11.7";

var program = new commander.Command("zl");


program
  .version(version)
  .description("A linter/compiler for Zettel markdown repositories")
  .option('--verbose')
  ;
console.log(`zettel-lint (v${version}). See LICENCE for copyright details.`)

program.addCommand(indexerCommand());
program.addCommand(importerCommand());
program.addCommand(notesCommand());
program
  .parse(process.argv);

if (program.opts().verbose) {
  clear();
  console.log(
      chalk.red(
        figlet.textSync('zettel-lint', { horizontalLayout: 'full' })
      )
    );
}