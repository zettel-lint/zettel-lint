import { Command } from '@commander-js/extra-typings';
import { glob } from "glob";
import { promises as fs } from "fs";
import { idFromFilename } from "./file-handling.js";
import { clear } from "console";
import chalk from "chalk";
import figlet from "figlet";
import { PropertyCollector } from "./PropertyCollector.js";
import { exit } from "process";

interface ZlFixOptions {
  path: string; // Root path for search
  ignoreDirs: string[] | undefined; // Path(s) to ignore
  verbose: boolean; // Additional output
  // Additional options, required for Command compatibility
  [key: string]: any; // Allow additional options
}

export default function fixerCommand() : Command<[], ZlFixOptions> {
  const fixer = new Command<[], ZlFixOptions>('fix');
  fixer
    .description("Lint and fix notes markdown files. Will update existing files.")
    .alias("lint")
    .option('-p, --path <path>', "Root path for search", ".")
    .option('-i, --ignore-dirs <path...>', "Path(s) to ignore")
    .option('-v, --verbose', "Additional output", false)
    .action((cmdObj) => { fixNotes(cmdObj) })
  return fixer;
}

function printHeader(program: ZlFixOptions): void {
  if (program.verbose) {
    clear();
    console.log(
      chalk.red(
        figlet.textSync('zettel-lint-fix', { horizontalLayout: 'full' })
      )
    );
    console.log("Looking for notes in " + program.path);
    console.log("Ignoring dirs: " + program.ignoreDirs);
  }
}

function fixNotes(program: ZlFixOptions): void {
  printHeader(program);

  var ignoreList = [program.path + "/**/node_modules/**"]; 
  if (program.ignoreDirs) {
    ignoreList = ignoreList.concat(program.ignoreDirs);
  }

  async function parseFiles() {
    printHeader(program);

    const files = await glob(program.path + "/**/*.md", { ignore: ignoreList });
    console.log(files.length + " files found");

    const propCollector = new PropertyCollector();
    if (program.verbose) {
      console.log("Collecting properties from files...");
    }
  }

  parseFiles().catch((err) => {
    console.error(err);
    exit(2);
  });
}