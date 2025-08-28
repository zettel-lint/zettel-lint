import { Command } from '@commander-js/extra-typings';
import { glob } from "glob";
import { promises as fs } from "fs";
import { clear } from "console";
import chalk from "chalk";
import figlet from "figlet";
import { PropertyCollector } from "./PropertyCollector.js";
import { exit } from "process";
import { BaseRule, TrailingNewlineRule } from "./rules/BaseRule.js";

interface ZlFixOptions {
  path: string; // Root path for search
  ignoreDirs: string[] | undefined; // Path(s) to ignore
  rules: string[]; // Fixing rules to apply
  verbose: boolean; // Additional output
  outputDir: string; // Directory to output fixed files to
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
    .option('-o, --output-dir <path>', "Directory to output fixed files to. If not specified, files will be updated in place.", ".")
    .option('-r, --rules <rule...>', "Rules to use", [])
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

  var outputDir = program.outputDir;
  if (!outputDir.endsWith("/")) { outputDir += "/"; }

  const knownRules: { [key: string]: BaseRule } = { [TrailingNewlineRule.name]: new TrailingNewlineRule };
  const activeRules: BaseRule[] = [];

  if (program.rules) {
    // remove duplicates
    (new Set(program.rules)).forEach((r) => {
      if (!knownRules.hasOwnProperty(r)) {
        console.error(`Unknown rule: ${r}. Ignoring.`);
      }
      else {
        // create instance of rule whose name matches r and add to activeRules
        activeRules.push(knownRules[r]);
      }
    });
  }

  if (activeRules.length === 0) {
    console.error("No rules specified. Use --rules to specify rules to run.");
    return
  }

  async function parseFiles() {
    printHeader(program);

    const files = await glob(program.path + "/**/*.md", { ignore: ignoreList });
    console.log(files.length + " files found");

    if (program.verbose) {
      console.log("Collecting properties from files...");
    }
    files.forEach(async (filename) => {
      try {
        const contents = await fs.readFile(filename, "utf8");
        let newContents = contents; // Start with original contents
        let fileChanged = false;
        activeRules.forEach((rule) => {
          const result = rule.fix(newContents, filename);
          if (result !== newContents) {
            fileChanged = true;
            newContents = result; // Update contents for next rule
            if (program.verbose) {
              console.log(`Rule ${rule.name} applied to ${filename}`);
            }
          }
        });
        if (fileChanged) {
          const relativePath = filename.startsWith(program.path) ? filename.slice(program.path.length) : filename;
          const outputPath = outputDir + relativePath;
          const outputDirPath = outputPath.substring(0, outputPath.lastIndexOf("/"));
          await fs.mkdir(outputDirPath, { recursive: true }); // Ensure directory exists
          await fs.writeFile(outputPath, newContents, "utf8");
          if (program.verbose) {
            console.log(`Updated file written to ${outputPath}`);
          }
        } else if (program.verbose) {
          console.log(`No changes for ${filename}`);
        }
      } catch (error) {
        console.error(`Error processing file ${filename}:`, error);
      }
    });
  }

  parseFiles().catch((err) => {
    console.error(err);
    exit(2);
  });
}