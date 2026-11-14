import path from "node:path";
import { Command } from "@commander-js/extra-typings";
import { clear } from "console";
import chalk from "chalk";
import figlet from "figlet";
import { NodeFileAdapter } from "../file-adapter.js";
import { FixConfigurationError, fixNotes } from "../zl-fix-core.js";
import { RuleExecutionConfig, ZlFixOptions } from "../core-options.js";
import { InlinePropertiesToFrontmatter } from "../rules/InlinePropertiesToFrontmatterRule.js";
import { FrontmatterTemplateRule } from "../rules/FrontmatterTemplateRule.js";
import { TrailingNewlineRule } from "../rules/BaseRule.js";
import { IdToWikiLinksRule } from "../rules/IdToWikiLinksRule.js";
import { cliPath, cliPattern, commonPathRoot, isSkippableFileError } from "./cli-paths.js";
import { loadFixConfig } from "../fix-config.js";

export { fixNotes } from "../zl-fix-core.js";
export type { ZlFixOptions, RuleExecutionConfig } from "../core-options.js";

export interface ZlFixCommandOptions {
  [key: string]: any;
  path: string;
  config?: string;
  ignoreDirs?: string[];
  rules: string[];
  propertyFilter?: string[];
  verbose: boolean;
  outputDir?: string;
  move: boolean;
  frontmatterTemplate?: string;
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
  let effectiveRules = program.rules ?? [];
  let effectiveIgnoreDirs = program.ignoreDirs;
  let effectivePropertyFilter = program.propertyFilter ?? [];
  let effectiveMove = program.move;
  let ruleConfigs: RuleExecutionConfig[] = [];

  if (program.config) {
    try {
      const fileConfig = await loadFixConfig(program.config);
      // Acceptance Criterion 1: If a rule is provided in the file and on the command line, command line takes preference
      if (effectiveRules.length === 0 && fileConfig.rules) {
        effectiveRules = fileConfig.rules.map((r) => (typeof r === "string" ? r : r.name));
      }
      if (fileConfig.rules) {
        ruleConfigs = fileConfig.rules.map((r): RuleExecutionConfig => {
          if (typeof r === "string") {
            return { name: r };
          }
          return {
            name: r.name,
            include: r.include,
            exclude: r.exclude,
            propertyFilter: r.propertyFilter,
            move: program.move ? true : r.move,
          };
        });
      }
      if (!effectiveIgnoreDirs && fileConfig.ignoreDirs) {
        effectiveIgnoreDirs = fileConfig.ignoreDirs;
      }
      if (effectivePropertyFilter.length === 0 && fileConfig.propertyFilter) {
        effectivePropertyFilter = fileConfig.propertyFilter;
      }
      if (!effectiveMove && fileConfig.move) {
        effectiveMove = fileConfig.move;
      }
    } catch (err) {
      console.error(err);
      process.exitCode = 3;
      return;
    }
  }

  const outputDir = program.outputDir ?? program.path;
  const knownRules = [
    new FrontmatterTemplateRule().name,
    new TrailingNewlineRule().name,
    new InlinePropertiesToFrontmatter(effectiveMove, []).name,
    IdToWikiLinksRule.ruleName,
  ];
  printHeader({ ...program, rules: effectiveRules, ignoreDirs: effectiveIgnoreDirs, propertyFilter: effectivePropertyFilter, move: effectiveMove, outputDir }, knownRules);
  for (const rule of new Set(effectiveRules)) {
    if (!knownRules.includes(rule)) {
      console.error(`Unknown rule: ${rule}. Ignoring.`);
    }
  }

  try {
    const root = commonPathRoot([program.path, outputDir], []);
    const adapter = new NodeFileAdapter(root);
    const options: ZlFixOptions = {
      path: cliPath(program.path, root),
      ignoreDirs: effectiveIgnoreDirs?.map((pattern) => cliPattern(pattern, root, program.path)),
      rules: effectiveRules,
      ruleConfigs,
      ruleGlobPath: path.relative(process.cwd(), path.resolve(program.path)).split(path.sep).join("/"),
      propertyFilter: effectivePropertyFilter,
      verbose: program.verbose,
      outputDir: cliPath(outputDir, root),
      move: effectiveMove,
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
    .option("-c, --config <path>", "Path to configuration file (JSON/YAML) or '-' for stdin")
    .option("-i, --ignore-dirs <path...>", "Path(s) to ignore")
    .option("-o, --output-dir <path>", "Directory to output fixed files to. If not specified, files will be updated in place.")
    .option("-r, --rules <rule...>", "Rules to use", [])
    .option("-f, --property-filter <regex...>", "Regex patterns to filter which properties to move. Only applies to inline-properties-to-frontmatter rule.", [])
    .option("-m, --move", "Move inline properties to frontmatter instead of copying", false)
    .option("-t, --frontmatter-template <template>", "YAML frontmatter template to add to files missing frontmatter")
    .option("-v, --verbose", "Additional output", false)
    .allowExcessArguments(true)
    .action(async (cmdObj) => await runFixer(cmdObj as ZlFixCommandOptions));
  return fixer;
}
