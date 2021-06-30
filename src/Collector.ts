import { formatData, fileWikiLinks, invertData } from "./types";
import fm, { FrontMatterResult } from "front-matter";

export class YamlHeaders {
  tags: string[] | undefined;
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
  protected collectYaml(content: string) : FrontMatterResult<YamlHeaders> {
    return fm(content);
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
}
