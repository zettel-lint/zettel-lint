#!/usr/bin/env node

import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import commander from "commander";
import TrelloImport from "./trello-import";
import { ErrorResponse } from "./base-importer";
import { exit } from "process";
import { resolve } from "path";

export default function importerCommand() {
  const idxer = new commander.Command('import');
  idxer
    .description("Import once from a 3rd party. WIll create new files or OVERWRITE existing ones")
    .alias("sync")
    .requiredOption('-s, --source <name>', "Source *e.g. trello, csv, etc...*")
    .requiredOption('-p, --path <path>', "Search path, supports wildcards", ".")
    .option('-o, --output-folder <path>', "Folder to save notes to", "../import/")
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
    console.log("Looking for *" + program.source +"* files to import in " + program.path + " and outputting to " + program.outputFolder);
  }
}


function importer(program: any): void {
  printHeader(program);
  if(program.outputFolder === undefined) {
    program.outputFolder = '../' + program.source + '/'
  }

  function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function parseFiles() {
      var response: ErrorResponse;

      switch (program.source) {
          case "trello": response = await (new TrelloImport).importAsync(program.path, program.outputFolder); break;
          case "unknown": await delay(100); response = { success: true, message: "No-op" }; break;
          default:
              response = { success: false, message: "Unknown source " + program.source };
      }

      if ((response !== undefined) && (!response.success)) {
        console.error(response.message);
        exit(1);
      }
  };

  parseFiles().then(
    () => { if(program.verbose) { console.log("Updated") }},
    (reason) => { console.error("Error: " + reason); exit(2); }
  )
}