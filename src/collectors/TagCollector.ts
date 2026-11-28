import { formatData, invertDictionary } from "../types.js";
import { RegexCollector } from "./RegexCollector.js";

// A root flow mapping or node property can hide keys from the line-based detector.
const COMPLEX_YAML_ROOT = /^(?:[ \t]*(?:#[^\n]*)?\r?\n)*[ \t]*[{&!]/;

function decodeDoubleQuotedYamlKey(key: string): string | undefined {
  if (key.length < 2 || key[0] !== '"' || key[key.length - 1] !== '"') {
    return undefined;
  }

  let result = "";
  for (let i = 1; i < key.length - 1; i++) {
    if (key[i] !== "\\") {
      result += key[i];
      continue;
    }
    i++;
    if (i >= key.length - 1) return undefined;

    const escape = key[i];
    if (escape === "u" && i + 4 < key.length - 1) {
      const code = key.substring(i + 1, i + 5);
      if (!/^[0-9a-fA-F]{4}$/.test(code)) return undefined;
      result += String.fromCharCode(parseInt(code, 16));
      i += 4;
    } else if (escape === "U" && i + 8 < key.length - 1) {
      const code = key.substring(i + 1, i + 9);
      if (!/^[0-9a-fA-F]{8}$/.test(code)) return undefined;
      const codePoint = parseInt(code, 16);
      if (codePoint > 0x10ffff) return undefined;
      result += String.fromCodePoint(codePoint);
      i += 8;
    } else if (escape === "x" && i + 2 < key.length - 1) {
      const code = key.substring(i + 1, i + 3);
      if (!/^[0-9a-fA-F]{2}$/.test(code)) return undefined;
      result += String.fromCharCode(parseInt(code, 16));
      i += 2;
    } else {
      const escaped = {
        "0": "\0",
        "a": "\x07",
        "b": "\b",
        "t": "\t",
        "n": "\n",
        "v": "\v",
        "f": "\f",
        "r": "\r",
        "e": "\x1b",
        " ": " ",
        '"': '"',
        "/": "/",
        "\\": "\\",
        "N": "\u0085",
        "_": "\u00a0",
        "L": "\u2028",
        "P": "\u2029",
      }[escape];
      if (escaped === undefined) return undefined;
      result += escaped;
    }
  }
  return result;
}

function hasTagsYamlKey(header: string): boolean {
  const lines = header.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimStart();
    if (!line) continue;
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.substring(0, colonIndex).trim();
    if (key === "tags") return true;
    if (key.length >= 2 && key[0] === "'" && key[key.length - 1] === "'") {
      if (key.substring(1, key.length - 1).replaceAll("''", "'") === "tags") return true;
    }
    if (decodeDoubleQuotedYamlKey(key) === "tags") return true;
  }
  return false;
}

function hasMalformedYamlStructure(header: string): boolean {
  let squareDepth = 0;
  let curlyDepth = 0;
  let doubleQuoted = false;
  let singleQuoted = false;
  for (let i = 0; i < header.length; i++) {
    const char = header[i];
    if (char === '"' && !singleQuoted && (i === 0 || header[i - 1] !== "\\")) {
      doubleQuoted = !doubleQuoted;
    } else if (char === "'" && !doubleQuoted) {
      if (header[i + 1] === "'" && i + 1 < header.length) i++;
      else singleQuoted = !singleQuoted;
    } else if (!doubleQuoted && !singleQuoted) {
      if (char === "[") squareDepth++;
      else if (char === "]") squareDepth--;
      else if (char === "{") curlyDepth++;
      else if (char === "}") curlyDepth--;
    }
  }
  return doubleQuoted || singleQuoted || squareDepth !== 0 || curlyDepth !== 0;
}

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

    // Parse when the fast path sees tags or cannot rule them out.
    let rawYamlTags: string[] | undefined;
    const header = this.findFrontmatter(content)?.header;
    if (header && (COMPLEX_YAML_ROOT.test(header) || hasTagsYamlKey(header) || hasMalformedYamlStructure(header))) {
      rawYamlTags = this.collectYaml(content).tags;
    }

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
