import { fileWikiLinks, formatData, invertDictionary } from "../types.js";
import { RegexCollector } from "./RegexCollector.js";

export class TagCollector extends RegexCollector {
  protected format(references: formatData[]): string {
    var tagList: { [tag: string]: string[]; } = invertDictionary(references);

    var result: string = "";
    Object.keys(tagList).sort().forEach(tag => {
      result += "* " + tag + " : " + tagList[tag].join() + "\n";
    });

    return result;
  };
  /**
   * Collect inline hashtags and YAML tags, normalizing YAML tags to a leading `#`.
   * Exclude tags beginning with `#` followed by a digit when `ignoreNumericTags` is enabled.
   *
   * @param content - Markdown content to scan, including any YAML frontmatter.
   * @returns Collected tags after empty and optional numeric tag filtering.
   */
  collect(content: string) : string[] {
    let result = super.collect(content);
    let tags = this.collectYaml(content)?.tags;
    if (typeof(tags) === 'string') {
      tags = (tags as string).split(' ');
    }
    result = result
      .concat(tags?.map((tg :string) => tg.startsWith("#") ? tg : "#" + tg) || [])
      .filter(tg => tg.length > 0 && tg != "#");

    if (this.programArgs?.ignoreNumericTags) {
      result = result.filter(tg => !/^#\d/.test(tg));
    }

    return result;
  }
  readonly dataName = "Tags";
  readonly regex = /(?: |^)(#[a-zA-Z0-9-_/]+)/g;
}
