#!/usr/bin/env node

import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import { Command } from '@commander-js/extra-typings';
import TrelloImport from "./trello-import.js";
import { ErrorResponse } from "./base-importer.js";
import { exit } from "process";

interface ZlImportOptions {
  source: string;
  path: string;
  outputFolder: string;
  trelloApiKey?: string;
  trelloBoard?: string;
  trelloToken?: string;
  jsonDebugOutput: boolean;
  verbose: boolean;
  [key: string]: any; // Allow additional options
}

export default function importerCommand() : Command<[], ZlImportOptions>{
  const idxer = new Command<[], ZlImportOptions>('import');
  idxer
    .description("Import once from a 3rd party. Will create new files or OVERWRITE existing ones")
    .alias("sync")
    .requiredOption('-s, --source <name>', "Source *e.g. trello, csv, etc...*")
    .requiredOption('-p, --path <path>', "Search path, supports wildcards", ".")
    .option('-o, --output-folder <path>', "Folder to save notes to", "../import/")
    .option('--trello-api-key <key>', 'Trello API key for direct board download')
    .option('--trello-board <idOrName>', 'Trello board id or name for direct download')
    .option('--trello-token <token>', 'Trello API token (required if using board name)')
    .option('--json-debug-output', "Output JSON intermediate representations")
    .option('-v, --verbose', "Additional output")
    .action((cmdObj) => { importer(cmdObj) })
  return idxer;
}

function printHeader(program: any): void {
  const safeProgram = { ...program };  
  if (safeProgram.trelloApiKey) safeProgram.trelloApiKey = '[REDACTED]';  
  if (safeProgram.trelloToken) safeProgram.trelloToken = '[REDACTED]';  
  console.log(JSON.stringify(safeProgram, null, 2));
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


import axios from "axios";

async function importer(program: any): Promise<void> {
  printHeader(program);
  if(program.outputFolder === undefined) {
    program.outputFolder = '../' + program.source + '/'
  }

  function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function parseFiles() {
    let response: ErrorResponse;
    if (
      program.source === "trello" &&
      program.trelloApiKey &&
      program.trelloBoard
    ) {
      // Download board JSON from Trello API using TrelloImport helper
      try {
        const boardJson = await TrelloImport.downloadBoardJson({
          boardIdOrName: program.trelloBoard,
          apiKey: program.trelloApiKey,
          token: program.trelloToken,
          verbose: program.verbose
        });
        if (program.jsonDebugOutput) {
          console.log("Trello board JSON:", JSON.stringify(boardJson, null, 2));
        } else {
          console.log("Downloaded Trello board with " + boardJson.cards.length + " cards and " + boardJson.lists.length + " lists.");
        }
        // Save to a temp file
        const tempFile = program.outputFolder + "/trello-board.json";
        const fsPromises = await import("fs/promises");
        await fsPromises.mkdir(program.outputFolder, { recursive: true });
        await fsPromises.writeFile(tempFile, JSON.stringify(boardJson, null, 2));
        // Now import as usual
        response = await (new TrelloImport).importAsync(tempFile, program.outputFolder);
      } catch (err: any) {
        console.error("Failed to process Trello board:", err.message || err);
        response = { success: false, message: "Failed to process Trello board: " + (err.message || err) };
      }
    } else {
      switch (program.source) {
        case "trello":
          response = await (new TrelloImport).importAsync(program.path, program.outputFolder);
          break;
        case "unknown":
          await delay(100);
          response = { success: true, message: "No-op" };
          break;
        default:
          response = { success: false, message: "Unknown source " + program.source };
      }
    }

    if ((response !== undefined) && (!response.success)) {
      console.error(response.message);
      exit(1);
    }
  };

  return await parseFiles();
  
}