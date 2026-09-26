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
   * Collects inline hashtags and YAML frontmatter tags, prefixing YAML tags with `#` as needed.
   * Empty tags are omitted; duplicates are preserved.
   *
   * If `ignoreNumericTags` or `ignore-numeric-tags` in the options passed to `collector`
   * is truthy, excludes tags from either source whose first character after `#` is an
   * ASCII digit. Numeric tags are included by default.
   *
   * @returns Inline matches followed by YAML tags, after filtering.
   * @throws Errors from parsing YAML frontmatter are propagated to the caller.
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

    if (this.programArgs?.ignoreNumericTags || this.programArgs?.["ignore-numeric-tags"]) {
      result = result.filter(tg => !/^#\d/.test(tg));
    }

    return result;
  }
  readonly dataName = "Tags";
  readonly regex = /(?: |^)(#[a-zA-Z0-9-_/]+)/g;
}
