import { formatData, fileWikiLinks } from "./types";

export abstract class Collector {
  abstract readonly dataName: string;
  public abstract collect(content: string): string[];
  private extractData(ref: fileWikiLinks): formatData {
    return {
      ...ref,
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
