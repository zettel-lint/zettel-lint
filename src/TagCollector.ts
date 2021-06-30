import { fileWikiLinks, formatData, invertDictionary } from "./types";
import { RegexCollector } from "./RegexCollector";

export class TagCollector extends RegexCollector {
  protected format(references: formatData[]): string {
    var tagList: { [tag: string]: string[]; } = invertDictionary(references);

    var result: string = "";
    Object.keys(tagList).sort().forEach(tag => {
      result += "* " + tag + " : " + tagList[tag].join() + "\n";
    });

    return result;
  };
  collect(content: string) : string[] {
    let result = super.collect(content);
    let tags = this.collectYaml(content)?.tags;
    if (typeof(tags) === 'string') {
      tags = (tags as string).split(' ');
    }
    result = result.concat(tags?.map((tg :string) => "#" + tg) || []);
    return result;
  }
  readonly dataName = "Tags";
  readonly regex = /(?: |^)(#[a-zA-z0-9-]+)/g;
}
