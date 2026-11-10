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
export async function loadFixConfig(input: string): Promise<FixConfigFile> {
  let content: string;
  if (input === "-" || input === "stdin") {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    content = Buffer.concat(chunks).toString("utf8");
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

  const config = parsed as Record<string, unknown>;
  if (config.rules !== undefined) {
    if (!Array.isArray(config.rules)) {
      throw new Error("rules must be an array");
    }
    config.rules.forEach((rule: unknown, index: number) => {
      const field = `rules[${index}]`;
      if (typeof rule === "string") {
        if (!rule.trim()) throw new Error(`${field}.name must be a non-empty string`);
        return;
      }
      if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
        throw new Error(`${field}.name must be a non-empty string`);
      }
      const entry = rule as Record<string, unknown>;
      if (typeof entry.name !== "string" || !entry.name.trim()) {
        throw new Error(`${field}.name must be a non-empty string`);
      }
      for (const key of ["include", "exclude", "propertyFilter"]) {
        const value = entry[key];
        if (value !== undefined && (!Array.isArray(value) || value.some(item => typeof item !== "string"))) {
          throw new Error(`${field}.${key} must be an array of strings`);
        }
      }
    });
  }
  return parsed as FixConfigFile;
}
