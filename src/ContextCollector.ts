import { formatData, invertDictionary } from "./types.js";
import { RegexCollector } from "./RegexCollector.js";

export class ContextCollector extends RegexCollector {
  protected format(references: formatData[]): string {
    var tagList: { [tag: string]: string[]; } = invertDictionary(references);

    var result: string = "";
    Object.keys(tagList).forEach(tag => {
      result += "* " + tag + " : " + tagList[tag].join() + "\n";
    });

    return result;
  };
  readonly dataName = "Contexts";
  readonly regex = /[ ^](\@[a-zA-z0-9]+)/g;
}
