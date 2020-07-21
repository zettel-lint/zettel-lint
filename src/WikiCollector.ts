import { formatData, invertDictionary, formatLink } from "./types";
import { RegexCollector } from "./RegexCollector";

export class WikiCollector extends RegexCollector {
  protected format(references: formatData[]): string {
    var backList: { [target: string]: string[]; } = invertDictionary(references);

    return references.map(r => "* " + formatLink(r) + " = `" + r.filename + "`:\n  * " + (r.data.length > 0 ? r.data : "No links") + "\n  * " + (backList["[" + (r.id ?? "") + "]"] ?? "No backlinks")).join("\n");
  }
  readonly dataName = "Links";
  readonly regex = /\[\d{8,14}\]/g;
}
