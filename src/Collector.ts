import { AnyTxtRecord } from "dns";
import { formatData, fileWikiLinks } from "./types";

export abstract class Collector {
  abstract readonly dataName: string;
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
  private extractData(ref: fileWikiLinks): formatData {
    return {
      ...ref,
      name: this.dataName,
      data: ref.matchData[this.dataName]
    };
  };
  public formatter(references: fileWikiLinks[]): string {
    return "## " + this.dataName + "\n\n<details>\n<summary>Show " + this.dataName + "</summary>\n\n" +
      this.format(
        references
          .map(r => this.extractData(r)))
      + "\n\n</details>";
  };
  protected abstract format(references: formatData[]): string;
}
