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
      return this.collect(content);
    }
    return [];
  }
  protected shouldCollect(filename: string): boolean { return true; }
  protected abstract collect(content: string): string[];
  private listOf(value: string): string[] {
    if (value.trim().startsWith("[")) {
      return value.trim().slice(1,-1).replaceAll(", ", ",").split(",");
    }
    return value.split(" ").filter(v => v.length > 0);
  }
  private getValue(headers: string[][], key: string) : string {
    const maybeValue = headers.find(h => h[0] === key);
    return maybeValue ? maybeValue[1] : "";
  }
  private readonly yamlSep = "---\n";
  protected collectYaml(content: string) : YamlHeaders {
    const result: YamlHeaders = Object.create(null);
    result.tags = undefined;
    if (!content.startsWith(this.yamlSep)){
      return result;
    }
    // Performance optimization: Avoid scanning full document when delimiter is unclosed,
    // and replace Object.entries array/callback allocations with for...in object iteration.
    const endIdx = content.indexOf(this.yamlSep, this.yamlSep.length);
    if (endIdx === -1) {
      return result;
    }
    const header = content.substring(this.yamlSep.length, endIdx);
    const yamlData = parse(header);

    if (!yamlData || typeof yamlData !== 'object') {
      return result;
    }

    for (const key in yamlData) {
      if (!Object.prototype.hasOwnProperty.call(yamlData, key)) continue;
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      const value = yamlData[key];
      if (key === 'tags') {
        result[key] = Array.isArray(value)
          ? value.map(v => String(v))
          : this.listOf(String(value));
      } else {
        const arr = Array.isArray(value) ? value : [value];
        result[key] = arr.map(v => String(v));
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
