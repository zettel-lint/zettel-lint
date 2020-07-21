import { formatData, formatLink } from "./types";
import { RegexCollector } from "./RegexCollector";

export class OrphanCollector extends RegexCollector {
  protected format(references: formatData[]): string {
    return references
      .filter(r => r.data.length > 0 && r.id !== undefined)
      .map(r => "* " + formatLink(r) + " `" + r.filename + "`: " + r.data.join()).join("\n");
  }
  readonly dataName = "Orphans";
  readonly regex = /\[[a-zA-Z0-9\[]+[a-zA-Z ]+.*\][^\(]/g;
}
