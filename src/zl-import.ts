#!/usr/bin/env node

import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import commander from "commander";

export default function importerCommand() {
  const idxer = new commander.Command('import');
  idxer
    .description("Import once from a 3rd party")
    .requiredOption('-s, --source <name>', "Source *e.g. Trello, CSV, etc...*")
    .option('-p, --path <path>', "Root path for search", ".")
    .option('--json-debug-output', "Output JSON intermediate representations")
    .option('-v, --verbose', "Additional output")
    .action((cmdObj) => { importer(cmdObj) })
  return idxer;
}

function printHeader(program: any): void {
  if (program.verbose) {
    clear();
    console.log(
      chalk.red(
        figlet.textSync('zettel-lint-import', { horizontalLayout: 'full' })
      )
    );
    console.log("Looking for *" + program.source +"* files to import in " + program.path);
  }
}


function importer(program: any): void {
    printHeader(program);
  
    async function parseFiles() {
        switch (program.source) {
            default:
                console.error("Unknown source " + program.source);
        }
    };
  
    parseFiles().then(
      () => console.log("Updated"),
      () => console.log("Error")
    )
  }