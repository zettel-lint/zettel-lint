import { Command } from '@commander-js/extra-typings';
import { glob } from "glob";
import { promises as fs } from "fs";
import { clear } from "console";
import { join, relative, dirname } from "node:path";
import chalk from "chalk";
import figlet from "figlet";
import { BaseRule, TrailingNewlineRule } from "./rules/BaseRule.js";
import { InlinePropertiesToFrontmatter } from './rules/InlinePropertiesToFrontmatterRule.js';
import { YAMLParseError } from 'yaml';

interface ZlFixOptions {
  path: string; // Root path for search
  ignoreDirs: string[] | undefined; // Path(s) to ignore
  rules: string[]; // Fixing rules to apply
  propertyFilter: string[] |  undefined; // Regex patterns to filter which properties to move
  verbose: boolean; // Additional output
  outputDir: string; // Directory to output fixed files to
  move: boolean; // Move inline properties to frontmatter instead of copying
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
    .option('-f, --property-filter <regex...>', "Regex patterns to filter which properties to move. Only applies to inline-properties-to-frontmatter rule.", [])
    .option('-m, --move', "Move inline properties to frontmatter instead of copying", false)
    .option('-v, --verbose', "Additional output", false)
    .allowExcessArguments(true)
    .action(async (cmdObj) => { await fixNotes(cmdObj) })
  return fixer;
}

function printHeader(program: ZlFixOptions, rules: string[] = []): void {
  if (program.verbose) {
    clear();
    console.log(
      chalk.red(
        figlet.textSync('zettel-lint-fix', { horizontalLayout: 'full' })
      )
    );
    console.log("Looking for notes in " + program.path);
    console.log("Ignoring dirs: " + program.ignoreDirs);
    console.log("Output dir: " + program.outputDir);
    console.log("Using rules: " + program.rules);
    console.log("Known rules: " + rules);
    console.log("Property filter: " + JSON.stringify(program.propertyFilter ?? []));
    console.log("Move inline properties: " + program.move);
  }
}

/**
 * Apply configured fix rules to Markdown files under the specified path.
 *
 * Converts any provided property-filter patterns into RegExp objects, instantiates available rules,
 * determines the active rule set, scans the filesystem for `*.md` files (respecting ignore lists),
 * applies each active rule in sequence to each file's contents, and writes changed files to the
 * configured output directory while preserving relative paths.
 *
 * program - Configuration for the run (path, rules, ignoreDirs, propertyFilter, outputDir, move, verbose).
 *
 * Side effects:
 * - May write updated files under `program.outputDir`.
 * - May create directories to mirror the input tree.
 * - Logs validation/errors and progress to the console.
 * - Sets `process.exitCode` to a non-zero value for certain failure conditions (invalid property-filter
 *   patterns => 2, runtime errors during processing => 2, no active rules specified => 3).
 *
 * The function resolves when processing completes; non-ENOENT file errors are propagated and will
 * be surfaced as failures (causing the process exit code to be set).
 *
 * @returns A promise that resolves once all files have been processed.
 */
async function fixNotes(program: ZlFixOptions): Promise<void> {
  // Convert propertyFilter strings to RegExp objects
  let propertyRegex: RegExp[] = [];
  if (program.propertyFilter && program.propertyFilter.length > 0) {
    try {
      propertyRegex = program.propertyFilter.map((pattern) => {
        const re = new RegExp(pattern);
        return re.global ? new RegExp(re.source, re.flags.replace('g','')) : re;
      });
    } catch (e: any) {
      console.error(`Invalid --propertyFilter pattern: ${e?.message ?? e}`);
      process.exitCode = 2;
      return;
    }
  }

  const importedRules: BaseRule[] = [new TrailingNewlineRule(), new InlinePropertiesToFrontmatter(program.move, propertyRegex)];
  const knownRules: { [key: string]: BaseRule } = {};
  var ruleNames: string[] = [];
  importedRules.forEach((r) => { knownRules[r.name] = r; ruleNames.push(r.name); });

  printHeader(program, ruleNames);

  let ignoreList = [join(program.path, "**", "node_modules", "**")];
  if (program.ignoreDirs) {
    ignoreList = ignoreList.concat(program.ignoreDirs);
  }

  let outputDir = program.outputDir;

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
    console.error("Known rules are: " + Object.keys(knownRules).join(", "));
    process.exitCode = 3;
  }

  async function parseFiles() {
    printHeader(program);

    const files = await glob(join(program.path, "**", "*.md"), { ignore: ignoreList });
    console.log(files.length + " files found");

    if (program.verbose) {
      console.log("Collecting properties from files...");
    }
    
    await Promise.all(files.map(async (filename) => {
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
          const relativePath = relative(program.path, filename);
          const outputPath = join(outputDir, relativePath);
          const outputDirPath = dirname(outputPath);
          await fs.mkdir(outputDirPath, { recursive: true }); // Ensure directory exists
          await fs.writeFile(outputPath, newContents, "utf8");
          if (program.verbose) {
            console.log(`Updated file written to ${outputPath}`);
          }
        } else if (program.verbose) {
          console.log(`No changes for ${filename}`);
        }
      } catch (error: any) {
        // Only rethrow if not ENOENT or YAMLParseError
        console.error(`Error processing file ${filename}:`, error);
        if (error.code !== 'ENOENT' && !(error instanceof YAMLParseError)) {
          throw error;
        }
      }
    }));
  }

  try {
    await parseFiles(); // Await the async function
  } catch (err) { 
    console.error(err);
    process.exitCode = 2;
  }
}