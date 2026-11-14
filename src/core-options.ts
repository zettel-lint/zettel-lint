import { FilePath, SearchPattern } from "./file-system.js";

export interface ZlIndexOptions {
  path: FilePath;
  ignoreDirs?: SearchPattern[];
  referenceFile: FilePath;
  createFile: FilePath;
  templateFile: FilePath;
  showOrphans: boolean;
  taskDisplay: "none" | "by-file" | "by-priority";
  jsonDebugOutput: boolean;
  ignoreNumericTags: boolean;
  wiki: boolean;
  verbose: boolean;
}

export interface RuleExecutionConfig {
  name: string;
  include?: string[];
  exclude?: string[];
  propertyFilter?: string[];
  move?: boolean;
}

export interface ZlFixOptions {
  path: FilePath;
  ignoreDirs?: SearchPattern[];
  rules: string[];
  ruleConfigs?: RuleExecutionConfig[];
  /** Stable input-directory prefix for rule globs; defaults to the adapter path. */
  ruleGlobPath?: string;
  propertyFilter?: string[];
  verbose: boolean;
  outputDir: FilePath;
  move: boolean;
  frontmatterTemplate?: string;
}
