import { formatData, invertDictionary } from "../types.js";
import { RegexCollector } from "./RegexCollector.js";
import type { YamlHeaders } from "./Collector.js";

export class PropertyCollector extends RegexCollector {
  readonly dataName = "Properties";
  readonly regex = /\[([\w-]+)::\s*([^\]]+)\]/g;

  protected format(references: formatData[]): string {
    const tagList = invertDictionary(references);
    return Object.entries(tagList)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tag, values]) => `* ${tag} : ${values.join()}\n`)
      .join('');
  }

  collect(content: string): string[] {
    return [];
  }

  /**
   * Collects properties from YAML frontmatter and inline pairs.
   * Regex filters apply ONLY to inline pairs; YAML-derived keys/values are always included.
   */
  collectProperties(content: string, regexes: Array<RegExp> = []): {properties: YamlHeaders, hasInline: boolean} {
    const pairs = this.collectPairs(content);
    const yaml = this.collectYaml(content);
    const allKeys = new Set([...Object.keys(yaml), ...Object.keys(pairs)]);
    const result: YamlHeaders = Object.create(null);

    // Performance optimization: Avoid mapping/allocating new RegExp instances when regexes array is empty.
    const safeRegexes = regexes.length > 0
      ? regexes.map(r => (r.global ? new RegExp(r.source, r.flags.replace('g', '')) : r))
      : [];

    let hasInline = false;
    // Performance optimization: Reuse array references directly when only one source exists
    // instead of creating redundant intermediate Sets and Array spreads for every key.
    allKeys.forEach(key => {
      const yamlValues = yaml[key];
      const pairValues = pairs[key];
      const hasYaml = yamlValues !== undefined && yamlValues.length > 0;
      const hasPair = pairValues !== undefined && pairValues.length > 0 && (safeRegexes.length === 0 || safeRegexes.some(r => r.test(key)));

      if (hasPair) {
        hasInline = true;
      }

      if (hasYaml || hasPair) {
        if (hasYaml && hasPair) {
          const combinedSet = new Set(yamlValues);
          for (let i = 0; i < pairValues.length; i++) {
            combinedSet.add(pairValues[i]);
          }
          result[key] = Array.from(combinedSet);
        } else if (hasYaml) {
          result[key] = yamlValues;
        } else {
          result[key] = pairValues;
        }
      }
    });

    return { properties: result, hasInline };
  }

  private collectPairs(content: string): YamlHeaders {
    this.regex.lastIndex = 0; // Reset regex state
    // Performance optimization: Accumulate values into direct Sets during regex execution
    // to avoid allocating new Sets and array spreads [...new Set([...existing, ...values])] on every match.
    const pairSets: Record<string, Set<string>> = Object.create(null);
    let match = this.regex.exec(content);

    while (match !== null) {
      const [, key, value] = match;
      if (key && value) {
        const trimmedKey = key.trim();
        if (trimmedKey !== '__proto__' && trimmedKey !== 'constructor' && trimmedKey !== 'prototype') {
          let set = pairSets[trimmedKey];
          if (!set) {
            set = new Set<string>();
            pairSets[trimmedKey] = set;
          }
          if (trimmedKey === 'tags') {
            const parts = value.split(", ");
            for (let i = 0; i < parts.length; i++) {
              set.add(parts[i]);
            }
          } else {
            set.add(value.trim());
          }
        }
      }
      match = this.regex.exec(content);
    }

    const result: YamlHeaders = Object.create(null);
    result.tags = pairSets.tags ? Array.from(pairSets.tags) : [];
    for (const k in pairSets) {
      if (k !== 'tags') {
        result[k] = Array.from(pairSets[k]);
      }
    }
    return result;
  }
}
