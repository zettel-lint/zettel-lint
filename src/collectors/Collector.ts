import { formatData, fileWikiLinks, invertData } from "../types.js";
import { parse, stringify } from 'yaml';

export interface YamlHeaders {
  [property: string]: string[] | undefined;
}

export abstract class Collector {
  abstract readonly dataName: string;
  protected yaml: any;
  protected programArgs: any;
  public collector(filename: string, content: string, program: any): string[] {
    this.programArgs = program;
    if (this.shouldCollect(filename)) {
      const processedContent = program?.ignoreQuoted ? this.stripQuoted(content) : content;
      return this.collect(processedContent);
    }
    return [];
  }

  /**
   * Strips quoted sections from content when ignoreQuoted option is enabled.
   * Strips:
   * 1. Code blocks (fenced with ``` or ~~~)
   * 2. Inline code (`code`)
   * 3. Blockquotes (lines starting with >)
   * 4. Double-quoted strings ("...") and single-quoted strings ('...')
   */
  protected stripQuoted(content: string): string {
    // Fenced code blocks: ```...``` or ~~~...~~~
    let stripped = content.replace(/(?:```|~~~)[\s\S]*?(?:```|~~~)/g, "");
    // Inline code: `...`
    stripped = stripped.replace(/`[^`\n]+`/g, "");
    // Blockquotes: lines starting with optional whitespace then >
    stripped = stripped.replace(/^[ \t]*>.*$/gm, "");
    // Double-quoted strings: "..."
    stripped = stripped.replace(/"[^"\n]*"/g, "");
    // Single-quoted strings: '...' (with boundary checks to preserve contractions like don't, it's)
    stripped = stripped.replace(/(?:^|[\s([{<])'[^'\n]+?'(?=[\s,.;:!?)]|$)/g, " ");
    return stripped;
  }
  protected shouldCollect(filename: string): boolean { return true; }
  protected abstract collect(content: string): string[];
  private listOf(value: string): string[] {
    const trimmed = value.trim();
    if (trimmed.startsWith("[")) {
      return trimmed.slice(1, -1).replaceAll(", ", ",").split(",");
    }
    const parts = trimmed.split(" ");
    const result: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].length > 0) {
        result.push(parts[i]);
      }
    }
    return result;
  }
  private getValue(headers: string[][], key: string) : string {
    for (let i = 0; i < headers.length; i++) {
      if (headers[i][0] === key) return headers[i][1];
    }
    return "";
  }
  private readonly yamlSep = "---\n";
  protected collectYaml(content: string) : YamlHeaders {
    const result: YamlHeaders = Object.create(null);
    result.tags = undefined;
    if (!content.startsWith(this.yamlSep)){
      return result;
    }
    // Performance optimization: Avoid executing YAML parser on unclosed or missing frontmatter
    const endIndex = content.indexOf(this.yamlSep, this.yamlSep.length);
    if (endIndex === -1) {
      return result;
    }
    const header = content.substring(this.yamlSep.length, endIndex);
    const yamlData = parse(header);

    if (!yamlData || typeof yamlData !== 'object') {
      return result;
    }

    // Performance optimization: Avoid Object.entries array allocations and map closures per property
    for (const key in yamlData) {
      // biome-ignore lint/suspicious/noPrototypeBuiltins: TS target is es2021 so Object.hasOwn cannot be used
      if (!Object.prototype.hasOwnProperty.call(yamlData, key)) continue;
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      const value = yamlData[key];
      if (key === 'tags') {
        if (Array.isArray(value)) {
          const arr: string[] = new Array(value.length);
          for (let i = 0; i < value.length; i++) {
            arr[i] = String(value[i]);
          }
          result[key] = arr;
        } else {
          result[key] = this.listOf(String(value));
        }
      } else if (Array.isArray(value)) {
        const arr: string[] = new Array(value.length);
        for (let i = 0; i < value.length; i++) {
          arr[i] = String(value[i]);
        }
        result[key] = arr;
      } else {
        result[key] = [String(value)];
      }
    }

    return result;
  }
  public extractData(ref: fileWikiLinks): formatData {
    return {
      ...ref,
      name: this.dataName,
      data: ref.matchData[this.dataName],
      bag: []
    };
  };
  public extractAll(files: fileWikiLinks[]): Map<string, formatData[]> {
    return invertData(files?.map(ref => this.extractData(ref)));
  }
  public formatter(references: fileWikiLinks[]): string {
    return "## " + this.dataName + "\n\n<details>\n<summary>Show " + this.dataName + "</summary>\n\n" +
      this.format(
        references
          .map(r => this.extractData(r)))
      + "\n\n</details>";
  };
  protected abstract format(references: formatData[]): string;
  public writeHeader(properties: YamlHeaders): string {
    return this.yamlSep + stringify(properties) + this.yamlSep;
  }

}
