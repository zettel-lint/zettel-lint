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
  const ruleConfigMap = new Map((program.ruleConfigs ?? []).map((rc) => [rc.name, rc]));
  const inlineConfig = ruleConfigMap.get("inline-properties-to-frontmatter");
  const propertyFilter = inlineConfig?.propertyFilter ?? program.propertyFilter;
  let propertyRegex: RegExp[] = [];
  if (propertyFilter?.length) {
    try {
      propertyRegex = propertyFilter.map((pattern) => {
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
    new InlinePropertiesToFrontmatter(inlineConfig?.move ?? program.move, propertyRegex),
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

  function matchesGlob(filepath: string, pattern: string): boolean {
    const normalized = filepath.replace(/\\/g, "/");
    let escaped = "";
    for (let i = 0; i < pattern.length; i++) {
      const token = pattern[i];
      if (token === "*") {
        if (pattern[i + 1] === "*") {
          escaped += ".*";
          i++;
        } else {
          escaped += "[^/]*";
        }
      } else if (token === "?") {
        escaped += "[^/]";
      } else {
        escaped += token.replace(/[.+^${}()|[\]\\]/g, "\\$&");
      }
    }
    return new RegExp(`(^|/)${escaped}$`).test(normalized) || new RegExp(`^${escaped}$`).test(normalized);
  }

  function shouldRunRule(ruleName: string, filepath: string): boolean {
    const config = ruleConfigMap.get(ruleName);
    if (!config) return true;

    if (config.include && config.include.length > 0) {
      const included = config.include.some((pat) => matchesGlob(filepath, pat));
      if (!included) return false;
    }

    if (config.exclude && config.exclude.length > 0) {
      const excluded = config.exclude.some((pat) => matchesGlob(filepath, pat));
      if (excluded) return false;
    }

    return true;
  }

  await Promise.all(files.map(async (filename) => {
    try {
      let newContents = await adapter.readFile(filename);
      const originalContents = newContents;
      const rulePath = [program.ruleGlobPath ?? program.path, filename.slice(prefix.length)]
        .filter(Boolean).join("/");
      activeRules.forEach((rule) => {
        if (shouldRunRule(rule.name, rulePath)) {
          newContents = rule.fix(newContents, filename);
        }
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
