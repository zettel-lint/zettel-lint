import { formatData, fileWikiLinks, invertData } from "./types.js";
import { parse, stringify } from 'yaml';

export class YamlHeaders {
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
    if (!content.startsWith(this.yamlSep)){
      return {tags: undefined};
    }
    const header = content.substring(this.yamlSep.length, content.indexOf(this.yamlSep, this.yamlSep.length));
    const yamlData = parse(header);
    const result: YamlHeaders = { };
    
    Object.entries(yamlData).forEach(([key, value]) => {
      if (key === 'tags') {
        result[key] = Array.isArray(value)
          ? value.map(v => String(v))
          : this.listOf(String(value));
      } else {
        const arr = Array.isArray(value) ? value : [value];
        result[key] = arr.map(v => String(v));
      }
    });
    
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
