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
    const rawMatches = super.collect(content);
    const yamlTags = this.collectYaml(content)?.tags;
    const ignoreNumeric = Boolean(
      this.programArgs?.ignoreNumericTags || this.programArgs?.["ignore-numeric-tags"]
    );

    // Performance optimization: Single-pass tag processing with indexed loops eliminates 4 intermediate
    // array allocations (.map, .concat, .filter, .filter) and replaces regex /^#\d/ with ASCII digit check.
    const result: string[] = [];

    for (let i = 0; i < rawMatches.length; i++) {
      const tg = rawMatches[i];
      if (tg.length > 0 && tg !== "#") {
        if (!ignoreNumeric || !(tg.length > 1 && tg.charCodeAt(1) >= 48 && tg.charCodeAt(1) <= 57)) {
          result.push(tg);
        }
      }
    }

    if (yamlTags) {
      const tagsArray = typeof yamlTags === "string" ? (yamlTags as string).split(" ") : yamlTags;
      for (let i = 0; i < tagsArray.length; i++) {
        const raw = tagsArray[i];
        if (!raw) continue;
        const tg = raw.startsWith("#") ? raw : "#" + raw;
        if (tg.length > 0 && tg !== "#") {
          if (!ignoreNumeric || !(tg.length > 1 && tg.charCodeAt(1) >= 48 && tg.charCodeAt(1) <= 57)) {
            result.push(tg);
          }
        }
      }
    }

    return result;
  }
  readonly dataName = "Tags";
  readonly regex = /(?: |^)(#[a-zA-Z0-9-_/]+)/g;
}
