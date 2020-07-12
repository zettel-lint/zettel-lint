import { formatData, invertDictionary } from "./types";
import { RegexCollector } from "./RegexCollector";

export class TagCollector extends RegexCollector {
  protected format(references: formatData[]): string {
    var tagList: { [tag: string]: string[]; } = invertDictionary(references);

    var result: string = "";
    Object.keys(tagList).forEach(tag => {
      result += "* " + tag + " : " + tagList[tag].join() + "\n";
    });

    return result;
  };
  readonly dataName = "Tags";
  readonly regex = /[ ^](#[a-zA-z0-9-]+)/g;
}
