import { fileWikiLinks, formatData, invertDictionary } from "./types.js";
import { RegexCollector } from "./RegexCollector.js";
import { YamlHeaders } from "./Collector.js";

// Properties either in yaml or in [property:: value] format
export class PropertyCollector extends RegexCollector {
  protected format(references: formatData[]): string {
    var tagList: { [tag: string]: string[]; } = invertDictionary(references);

    var result: string = "";
    Object.keys(tagList).sort().forEach(tag => {
      result += "* " + tag + " : " + tagList[tag].join() + "\n";
    });

    return result;
  };
  collectProperties(content: string): YamlHeaders {
    let pairs = this.collectPairs(content);
    let yaml = this.collectYaml(content);
    let result: YamlHeaders = { tags: [] };

    // Merge tags from YAML and inline properties
    if (yaml.tags) {
      result.tags = [...yaml.tags];
    }
    if (pairs.tags) {
      result.tags = [...new Set([...(result.tags || []), ...(pairs.tags || [])])];
    }

    // Merge all other properties
    const allKeys = new Set([...Object.keys(yaml), ...Object.keys(pairs)]);
    allKeys.forEach(key => {
      if (key === 'tags') return; // Already handled above
      
      const yamlValues = yaml[key] || [];
      const pairValues = pairs[key] || [];
      if (yamlValues.length > 0 || pairValues.length > 0) {
        result[key] = [...new Set([...yamlValues, ...pairValues])];
      }
    });

    return result;
  }
  collectPairs(content: string): YamlHeaders {
    var result: YamlHeaders = { tags: [] };
    var next: RegExpExecArray | null;
    do {
      next = this.regex.exec(content);
      if (next) {
        if (next[1] && next[2]) {
          const key = next[1].trim();
          // For non-tags properties, store as a single-item array
          const values = key === 'tags' ? next[2].split(", ") : [next[2].trim()];
          if (result[key]) {
            result[key] = [...new Set([...result[key]!, ...values])];
          } else {
            result[key] = values;
          }
        }
      }
    } while (next);
    return result;
  }
  readonly dataName = "Properties";
  readonly regex = /(?: |^)\[([a-zA-Z0-9-_/]+)::\s*([^\]]+)\]/g;
}
