#!/usr/bin/env node

import clear from "clear";
import figlet from "figlet";
import indexerCommand from "./zl-index.js";
import importerCommand from "./zl-import.js";
import notesCommand from "./zl-notes.js";
import chalk from "chalk";
import { Command } from '@commander-js/extra-typings';

// THIS import is outside `src/` folder so fails the build
// import {version as packageVersion} from "../package.json";

export const version = "0.12.2";

var program = new Command("zl")
  .version(version)
  .description("A linter/compiler for Zettel markdown repositories")
  .option('--verbose')
  ;
console.log(`zettel-lint (v${version}). See LICENCE for copyright details.`)

program.addCommand(indexerCommand());
program.addCommand(importerCommand());
program.addCommand(notesCommand());
await program
  .parseAsync(process.argv);

if (program.opts().verbose) {
  clear();
  console.log(
      chalk.red(
        figlet.textSync('zettel-lint', { horizontalLayout: 'full' })
      )
    );
}