import { formatData, invertDictionary } from "../types.js";
import { RegexCollector } from "./RegexCollector.js";

export class TagCollector extends RegexCollector {
  protected format(references: formatData[]): string {
    const tagList: { [tag: string]: string[] } = invertDictionary(references);
    const keys = Object.keys(tagList).sort();

    let result = "";
    // Performance optimization: Replace .forEach closure allocations with indexed loop
    for (let i = 0; i < keys.length; i++) {
      const tag = keys[i];
      result += "* " + tag + " : " + tagList[tag].join() + "\n";
    }

    return result;
  }

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
  collect(content: string): string[] {
    const inlineMatches = super.collect(content);
    const rawYamlTags = this.collectYaml(content)?.tags;

    const result: string[] = [];

    // Filter inline matches for valid tags
    for (let i = 0; i < inlineMatches.length; i++) {
      const tg = inlineMatches[i];
      if (tg && tg.length > 1 && tg !== "#") {
        result.push(tg);
      }
    }

    if (rawYamlTags) {
      // Safely handle both array and string inputs for YAML tags
      const yamlTags = typeof (rawYamlTags as unknown) === "string"
        ? (rawYamlTags as unknown as string).split(" ")
        : rawYamlTags;

      for (let i = 0; i < yamlTags.length; i++) {
        const item = String(yamlTags[i]);
        if (!item) continue;
        const tg = item.startsWith("#") ? item : "#" + item;
        if (tg.length > 1 && tg !== "#") {
          result.push(tg);
        }
      }
    }

    if (this.programArgs?.ignoreNumericTags || this.programArgs?.["ignore-numeric-tags"]) {
      // Performance optimization: Direct ASCII charCode check (0x35='#', 0x30..0x39='0'..'9')
      // and in-place filter pass eliminates per-tag RegExp (/^#\d/) compilation/execution and extra array allocation.
      let writeIdx = 0;
      for (let i = 0; i < result.length; i++) {
        const tg = result[i];
        if (
          tg.length > 1 &&
          tg.charCodeAt(0) === 35 &&
          tg.charCodeAt(1) >= 48 &&
          tg.charCodeAt(1) <= 57
        ) {
          continue;
        }
        result[writeIdx++] = tg;
      }
      result.length = writeIdx;
    }

    return result;
  }

  readonly dataName = "Tags";
  readonly regex = /(?: |^)(#[a-zA-Z0-9-_/]+)/g;
}
