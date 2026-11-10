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
    const trimmed = value.trim();
    if (trimmed.startsWith("[")) {
      const end = trimmed.endsWith("]") ? trimmed.length - 1 : trimmed.length;
      return trimmed.slice(1, end).split(",").map((item) => item.trim());
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
  private readonly yamlOpening = /^---\r?\n/;
  protected collectYaml(content: string) : YamlHeaders {
    const result: YamlHeaders = Object.create(null);
    result.tags = undefined;
    const opening = this.yamlOpening.exec(content);
    if (!opening) {
      return result;
    }
    const closing = /\r?\n---(?:\r?\n|$)/g;
    closing.lastIndex = opening[0].length;
    const endMatch = closing.exec(content);
    if (!endMatch) {
      return result;
    }
    const header = content.substring(opening[0].length, endMatch.index);
    const yamlData = parse(header);

    if (!yamlData || typeof yamlData !== 'object') {
      return result;
    }

    // Performance optimization: Avoid Object.entries array allocations and map closures per property
    for (const key in yamlData) {
      // biome-ignore lint/suspicious/noPrototypeBuiltins: TS target is es2021 so Object.hasOwn cannot be used
      if (!Object.prototype.hasOwnProperty.call(yamlData, key)) continue;
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
    if (!files || files.length === 0) return new Map<string, formatData[]>();

    // Performance optimization: Avoid array allocation overhead by only accumulating
    // formatData items that contain non-empty collector data before passing to invertData.
    const formatDataList: formatData[] = [];
    for (let i = 0; i < files.length; i++) {
      const item = this.extractData(files[i]);
      if (item.data && item.data.length > 0) {
        formatDataList.push(item);
      }
    }
    return invertData(formatDataList);
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
