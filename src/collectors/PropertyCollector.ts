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
    // Only grab pairs that match a regex, if any are provided
    // Normalise supplied regexes to avoid stateful /g behaviour.
    const safeRegexes = regexes.map(r => (r.global ? new RegExp(r.source, r.flags.replace('g', '')) : r));

    var hasInline = false;
    // Merge properties from both sources
    allKeys.forEach(key => {
      const yamlValues = yaml[key] || [];
      let pairValues: string[] = [];
      if (safeRegexes.length === 0 || safeRegexes.some(r => r.test(key))) {
        pairValues = pairs[key] ?? [];
      }
      if (pairValues.length > 0) { hasInline = true; }

      if (yamlValues.length > 0 || pairValues.length > 0) {
        result[key] = [...new Set([...yamlValues, ...pairValues])];
      }
    });

    return { properties: result, hasInline };
  }

  private collectPairs(content: string): YamlHeaders {
    this.regex.lastIndex = 0; // Reset regex state
    const result: YamlHeaders = Object.create(null);
    result.tags = [];
    let match = this.regex.exec(content);

    while (match !== null) {
      const [, key, value] = match;
      if (key && value) {
        const trimmedKey = key.trim();
        if (trimmedKey !== '__proto__' && trimmedKey !== 'constructor' && trimmedKey !== 'prototype') {
          const values = trimmedKey === 'tags' ? value.split(", ") : [value.trim()];
          const existing = result[trimmedKey];
          result[trimmedKey] = existing
            ? [...new Set([...existing, ...values])]
            : values;
        }
      }
      match = this.regex.exec(content);
    }

    return result;
  }
}
