import { BaseRule, TrailingNewlineRule } from "./rules/BaseRule.js";
import { InlinePropertiesToFrontmatter } from "./rules/InlinePropertiesToFrontmatterRule.js";
import { FrontmatterTemplateRule } from "./rules/FrontmatterTemplateRule.js";
import { IdToWikiLinksRule } from "./rules/IdToWikiLinksRule.js";
import { escapeGlobPath, FileAdapter, FilePath, joinFilePath, joinSearchPattern, parentFilePath } from "./file-system.js";
import { ZlFixOptions } from "./core-options.js";

export type FileErrorHandler = (filepath: FilePath, error: unknown) => boolean;

export class FixConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FixConfigurationError";
  }
}

export async function fixNotes(
  program: ZlFixOptions,
  adapter: FileAdapter,
  onFileError?: FileErrorHandler,
): Promise<void> {
  let propertyRegex: RegExp[] = [];
  if (program.propertyFilter?.length) {
    try {
      propertyRegex = program.propertyFilter.map((pattern) => {
        const regex = new RegExp(pattern);
        return regex.global ? new RegExp(regex.source, regex.flags.replace("g", "")) : regex;
      });
    } catch (error) {
      throw new FixConfigurationError(
        `Invalid property-filter regex pattern: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const knownRuleNames = [
    new FrontmatterTemplateRule(program.frontmatterTemplate).name,
    new InlinePropertiesToFrontmatter(program.move, propertyRegex).name,
    new TrailingNewlineRule().name,
    IdToWikiLinksRule.ruleName,
  ];
  const ruleNames = new Set(program.rules);
  if (program.frontmatterTemplate) {
    ruleNames.add("frontmatter-template");
  }
  if (!knownRuleNames.some((name) => ruleNames.has(name))) {
    throw new FixConfigurationError(
      `No rules specified. Known rules are: ${knownRuleNames.join(", ")}`,
    );
  }

  const pathPattern = escapeGlobPath(program.path);
  const files = await adapter.listFiles(
    [joinSearchPattern(pathPattern, "**/*.md")],
    [
      joinSearchPattern(pathPattern, "**/node_modules/**"),
      ...(program.ignoreDirs ?? []),
    ],
  );
  const importedRules: BaseRule[] = [
    new FrontmatterTemplateRule(program.frontmatterTemplate),
    new InlinePropertiesToFrontmatter(program.move, propertyRegex),
    new TrailingNewlineRule(),
    new IdToWikiLinksRule(files, program.path),
  ];
  // Keep the rule order deterministic regardless of the order provided on the command line.
  const activeRules = importedRules.filter((rule) => ruleNames.has(rule.name));
  const prefix = program.path ? `${program.path}/` : "";

  await Promise.all(files.map(async (filename) => {
    try {
      let newContents = await adapter.readFile(filename);
      const originalContents = newContents;
      activeRules.forEach((rule) => {
        newContents = rule.fix(newContents, filename);
      });
      if (newContents !== originalContents) {
        const relativePath = filename.slice(prefix.length);
        const outputPath = joinFilePath(program.outputDir, relativePath);
        const outputDirectory = parentFilePath(outputPath);
        if (outputDirectory && adapter.mkdir) {
          await adapter.mkdir(outputDirectory);
        }
        await adapter.writeFile(outputPath, newContents);
      }
    } catch (error) {
      if (!onFileError?.(filename, error)) {
        throw error;
      }
    }
  }));
}
