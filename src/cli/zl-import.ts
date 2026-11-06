#!/usr/bin/env node

import path from "node:path";
import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import { Command } from '@commander-js/extra-typings';
import TrelloImport, { TrelloOptions } from "../trello-import.js";
import { ErrorResponse } from "../base-importer.js";

interface ZlImportOptions {
  source: string;
  path: string;
  outputFolder: string;
  trelloApiKey?: string;
  trelloBoard?: string;
  trelloToken?: string;
  jsonDebugOutput: boolean;
  verbose: boolean;
  [key: string]: any; // Allow additional options, required for Command compatibility
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
    .option('--json-debug-output', "Output JSON intermediate representations", false)
    .option('-v, --verbose', "Additional output", false)
    .action(async (cmdObj) => { await importer(cmdObj as ZlImportOptions) })
  return idxer;
}

function printHeader(program: ZlImportOptions): void {
  const safeProgram: Record<string, any> = {};
  for (const [key, value] of Object.entries(program)) {
    if (/key|token|secret|password|credential|auth/i.test(key) && typeof value === 'string' && value.length > 0) {
      safeProgram[key] = '[REDACTED]';
    } else {
      safeProgram[key] = value;
    }
  }
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

/**
 * Runs the selected import, writing or overwriting notes in program.outputFolder.
 * If the output folder is undefined, sets it to `../<source>/` on program.
 *
 * @returns Resolves without a result after processing, including reported failures.
 * @throws Errors from importing local Trello files propagate.
 */
async function importer(program: ZlImportOptions): Promise<void> {
  printHeader(program);
  if(program.outputFolder === undefined) {
    program.outputFolder = '../' + program.source + '/'
  }

  function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Imports local Trello JSON matching program.path, or downloads a board when both
   * an API key and board are supplied. Downloads create the output directory and
   * write or overwrite trello-board.json there before importing it.
   * Errors in the download flow are caught and reported; local import errors propagate.
   * The source "unknown" completes after a 100 ms delay; unsupported sources report failure.
   */
  async function parseFiles() {
    let response: ErrorResponse;
      const options : TrelloOptions = {
        verbose: program.verbose,
        boardIdOrName: program.trelloBoard || "<missing>",
        apiKey: program.trelloApiKey || "<missing>",
        token: program.trelloToken || "<missing>",
      };
    if (
      program.source === "trello" &&
      program.trelloApiKey &&
      program.trelloBoard
    ) {

      // Download board JSON from Trello API using TrelloImport helper
      try {
        const boardJson = await TrelloImport.downloadBoardJson(options);
        if (program.jsonDebugOutput) {
          console.log("Trello board JSON:", JSON.stringify(boardJson, null, 2));
        } else {
          console.log("Downloaded Trello board with " + boardJson.cards.length + " cards and " + boardJson.lists.length + " lists.");
        }
        // Save to a temp file
        const tempFile = path.join(program.outputFolder, "trello-board.json");
        const fsPromises = await import("fs/promises");
        await fsPromises.mkdir(program.outputFolder, { recursive: true });
        await fsPromises.writeFile(tempFile, JSON.stringify(boardJson, null, 2));
        // Now import as usual
        response = await (new TrelloImport).importAsync(tempFile.split(path.sep).join("/"), program.outputFolder, options);
      } catch (err: any) {
        console.error("Failed to process Trello board:", err.message || err);
        response = { success: false, message: "Failed to process Trello board: " + (err.message || err) };
      }
    } else {
      switch (program.source) {
        case "trello":
          response = await (new TrelloImport).importAsync(program.path, program.outputFolder, options);
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
      return;
    }
  };

  return await parseFiles();
  
}