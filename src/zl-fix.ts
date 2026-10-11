import { Command } from "@commander-js/extra-typings";
import { clear } from "console";
import chalk from "chalk";
import figlet from "figlet";
import { NodeFileAdapter } from "./file-adapter.js";
import { FixConfigurationError, fixNotes } from "./zl-fix-core.js";
import { ZlFixOptions } from "./core-options.js";
import { InlinePropertiesToFrontmatter } from "./rules/InlinePropertiesToFrontmatterRule.js";
import { TrailingNewlineRule } from "./rules/BaseRule.js";
import { cliPath, cliPattern, commonPathRoot, isSkippableFileError } from "./cli-paths.js";

export { fixNotes } from "./zl-fix-core.js";
export type { ZlFixOptions } from "./core-options.js";

export interface ZlFixCommandOptions {
  [key: string]: any;
  path: string;
  ignoreDirs?: string[];
  rules: string[];
  propertyFilter?: string[];
  verbose: boolean;
  outputDir: string;
  move: boolean;
}

function printHeader(program: ZlFixCommandOptions, knownRules: string[]): void {
  if (program.verbose) {
    clear();
    console.log(chalk.red(figlet.textSync("zettel-lint-fix", { horizontalLayout: "full" })));
    console.log("Looking for notes in " + program.path);
    console.log("Ignoring dirs: " + program.ignoreDirs);
    console.log("Output dir: " + program.outputDir);
    console.log("Using rules: " + program.rules);
    console.log("Known rules: " + knownRules);
    console.log("Property filter: " + JSON.stringify(program.propertyFilter ?? []));
    console.log("Move inline properties: " + program.move);
  }
}

async function runFixer(program: ZlFixCommandOptions): Promise<void> {
  const knownRules = [
    new TrailingNewlineRule().name,
    new InlinePropertiesToFrontmatter(program.move, []).name,
  ];
  printHeader(program, knownRules);
  for (const rule of new Set(program.rules ?? [])) {
    if (!knownRules.includes(rule)) {
      console.error(`Unknown rule: ${rule}. Ignoring.`);
    }
  }

  try {
    const root = commonPathRoot([program.path, program.outputDir], []);
    const adapter = new NodeFileAdapter(root);
    const options: ZlFixOptions = {
      ...program,
      path: cliPath(program.path, root),
      ignoreDirs: program.ignoreDirs?.map((pattern) => cliPattern(pattern, root)),
      outputDir: cliPath(program.outputDir, root),
    };
    await fixNotes(options, adapter, (filepath, error) => {
      console.error(`Error processing file ${filepath}:`, error);
      return isSkippableFileError(error);
    });
  } catch (error) {
    console.error(error);
    process.exitCode = error instanceof FixConfigurationError ? 3 : 2;
  }
}

export default function fixerCommand(): Command<[], ZlFixCommandOptions> {
  const fixer = new Command<[], ZlFixCommandOptions>("fix");
  fixer
    .description("Lint and fix notes markdown files. Will update existing files.")
    .alias("lint")
    .option("-p, --path <path>", "Root path for search", ".")
    .option("-i, --ignore-dirs <path...>", "Path(s) to ignore")
    .option("-o, --output-dir <path>", "Directory to output fixed files to. If not specified, files will be updated in place.", ".")
    .option("-r, --rules <rule...>", "Rules to use", [])
    .option("-f, --property-filter <regex...>", "Regex patterns to filter which properties to move. Only applies to inline-properties-to-frontmatter rule.", [])
    .option("-m, --move", "Move inline properties to frontmatter instead of copying", false)
    .option("-v, --verbose", "Additional output", false)
    .allowExcessArguments(true)
    .action(async (cmdObj) => await runFixer(cmdObj as ZlFixCommandOptions));
  return fixer;
}
