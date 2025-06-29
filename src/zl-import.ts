#!/usr/bin/env node

import clear from "clear";
import chalk from "chalk";
import figlet from "figlet";
import * as commander from "commander";
import TrelloImport from "./trello-import.js";
import { ErrorResponse } from "./base-importer.js";
import { exit } from "process";
import { resolve } from "path";

export default function importerCommand() {
  const idxer = new commander.Command('import');
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

function importer(program: any): void {
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
      // Download board JSON from Trello API
      try {
        let boardIdOrName = program.trelloBoard;
        const apiKey = program.trelloApiKey;
        // If not a Trello board id (alphanumeric, 8 or 24 chars), look up by name
        if (!/^([0-9a-f]{8}|[0-9a-f]{24})$/i.test(boardIdOrName)) {
          if (program.verbose) {
            console.log(`Looking up Trello board id for name: ${boardIdOrName}`);
          }
          // User must provide a Trello token for this API call
          if (!program.trelloToken) {
            throw new Error("A Trello token (--trello-token) is required to look up boards by name.");
          }
          // Get all boards for the user
          const boardsUrl = `https://api.trello.com/1/members/me/boards?key=${apiKey}&token=${program.trelloToken}`;
          const boardsRes = await axios.get(boardsUrl);
          const boards = boardsRes.data;
          const found = boards.find((b: any) => b.name === boardIdOrName);
          if (!found) {
            throw new Error(`Could not find Trello board with name: ${boardIdOrName}`);
          }
          boardIdOrName = found.id;
          if (program.verbose) {
            console.log(`Resolved board name '${program.trelloBoard}' to id: ${boardIdOrName}`);
          }
        }
        // For public boards, only API key is needed. For private, a token is also needed (not supported here yet)
        const url = `https://api.trello.com/1/boards/${boardIdOrName}?key=${apiKey}&cards=all&lists=all&checklists=all&labels=all&members=all&fields=all` + (program.trelloToken ? `&token=${program.trelloToken}` : '');
        if (program.verbose) {
          console.log("Downloading Trello board from:", url);
        }
        const res = await axios.get(url);
        const boardJson = res.data;
        // Save to a temp file
        const tempFile = program.outputFolder + "/trello-board.json";
        const fs = await import("fs/promises");
        await fs.mkdir(program.outputFolder, { recursive: true });
        await fs.writeFile(tempFile, JSON.stringify(boardJson, null, 2));
        // Now import as usual
        response = await (new TrelloImport).importAsync(tempFile, program.outputFolder);
      } catch (err: any) {
        console.error("Failed to download Trello board:", err.message || err);
        response = { success: false, message: "Failed to download Trello board: " + (err.message || err) };
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

  parseFiles().then(
    () => { if(program.verbose) { console.log("Updated") }},
    (reason) => { console.error("Error: " + reason); exit(2); }
  )
}