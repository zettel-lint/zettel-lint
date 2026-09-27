import { formatData, invertDictionary } from "../types.js";
import { RegexCollector } from "./RegexCollector.js";

export class ContextCollector extends RegexCollector {
  protected format(references: formatData[]): string {
    const tagList: { [tag: string]: string[]; } = invertDictionary(references);

    let result: string = "";
    Object.keys(tagList).forEach(tag => {
      result += "* " + tag + " : " + tagList[tag].join() + "\n";
    });

    return result;
  };
  readonly dataName = "Contexts";
  readonly regex = /[ ^](@[a-zA-Z0-9]+)/g;
}
