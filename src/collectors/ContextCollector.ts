import { formatData, invertDictionary } from "../types.js";
import { RegexCollector } from "./RegexCollector.js";

export class ContextCollector extends RegexCollector {
  protected format(references: formatData[]): string {
    const tagList: { [tag: string]: string[] } = invertDictionary(references);
    const keys = Object.keys(tagList);

    let result = "";
    // Performance optimization: Replace .forEach closure allocations with indexed loop
    for (let i = 0; i < keys.length; i++) {
      const tag = keys[i];
      result += "* " + tag + " : " + tagList[tag].join() + "\n";
    }

    return result;
  }
  readonly dataName = "Contexts";
  readonly regex = /[ ^](\@[a-zA-Z0-9]+)/g;
}
