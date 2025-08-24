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
    let result = this.collectPairs(content);
    let properties = this.collectYaml(content);

    // Merge result and properties
    Object.keys(properties).forEach(key => {
      if (result[key] && properties[key]) {
        result[key] = [...new Set([...result[key], ...properties[key]])];
      } else {
        result[key] = properties[key];
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
          result[next[1].trim()] = next[2].split(", ");
        }
      }
    } while (next);
    return result;
  }
  readonly dataName = "Properties";
  readonly regex = /(?: |^)\[([a-zA-Z0-9-_/]+)\w*::\w*([a-zA-Z0-9-_/]+)\]/g;
}
