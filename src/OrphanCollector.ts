import { fileWikiLinks, formatData, formatLink } from "./types";
import { RegexCollector } from "./RegexCollector";

export class OrphanCollector extends RegexCollector {
  public extractAll(files: fileWikiLinks[]): Map<string, formatData[]> {
    var result = new Map<string, formatData[]>();
    files
      ?.filter(ref => ref.filename != undefined && ref.matchData?.Orphans?.length > 0)
      .map(ref => result.set(ref.filename ?? "", [this.extractData(ref)]));
    return result;
  }
  protected format(references: formatData[]): string {
    return references
      .filter(r => r.data.length > 0 && r.id !== undefined)
      .map(r => "* " + formatLink(r) + " `" + r.filename + "`: " + r.data.join()).join("\n");
  }
  readonly dataName = "Orphans";
  readonly regex = /\[[a-zA-Z0-9\[]+[a-zA-Z ]+.*\][^\(]/g;
}
