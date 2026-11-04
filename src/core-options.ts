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
  ignoreQuoted?: boolean;
  wiki: boolean;
  verbose: boolean;
}

export interface ZlFixOptions {
  path: FilePath;
  ignoreDirs?: SearchPattern[];
  rules: string[];
  propertyFilter?: string[];
  verbose: boolean;
  outputDir: FilePath;
  move: boolean;
}
