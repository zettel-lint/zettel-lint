import { formatData, invertDictionary } from "./types.js";
import { RegexCollector } from "./RegexCollector.js";
import { YamlHeaders } from "./Collector.js";

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

  collectProperties(content: string, regexes: Array<RegExp> = []): YamlHeaders {
    const pairs = this.collectPairs(content);
    const yaml = this.collectYaml(content);
    const allKeys = new Set([...Object.keys(yaml), ...Object.keys(pairs)]);
    const result: YamlHeaders = { };

    // Merge properties from both sources
    allKeys.forEach(key => {
      const yamlValues = yaml[key] || [];
      var pairValues: string[] = [];
      // Only grab pairs that match a regex, if any are provided
      if (regexes.length == 0 || regexes.some(r => r.test(key))) {
        pairValues = pairs[key] || [];
      }
      
      if (yamlValues.length > 0 || pairValues.length > 0) {
        result[key] = [...new Set([...yamlValues, ...pairValues])];
      }
    });

    return result;
  }

  private collectPairs(content: string): YamlHeaders {
    this.regex.lastIndex = 0; // Reset regex state
    const result: YamlHeaders = { tags: [] };
    let match: RegExpExecArray | null;

    while ((match = this.regex.exec(content)) !== null) {
      const [, key, value] = match;
      if (!key || !value) continue;

      const trimmedKey = key.trim();
      const values = trimmedKey === 'tags' ? value.split(", ") : [value.trim()];
      result[trimmedKey] = result[trimmedKey]
        ? [...new Set([...result[trimmedKey]!, ...values])]
        : values;
    }

    return result;
  }
}
