import fs from "node:fs";
import yaml from "yaml";

export interface RuleConfig {
  name: string;
  include?: string[];
  exclude?: string[];
  propertyFilter?: string[];
  move?: boolean;
}

export interface FixConfigFile {
  rules?: (string | RuleConfig)[];
  ignoreDirs?: string[];
  propertyFilter?: string[];
  move?: boolean;
}

/**
 * Loads fix configuration from a file path or stdin ("-" or "stdin").
 * Supports both JSON and YAML formats.
 */
export function loadFixConfig(input: string): FixConfigFile {
  let content: string;
  if (input === "-" || input === "stdin") {
    content = fs.readFileSync(0, "utf8");
  } else {
    content = fs.readFileSync(input, "utf8");
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    parsed = yaml.parse(trimmed);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Configuration file must contain an object");
  }

  return parsed as FixConfigFile;
}
