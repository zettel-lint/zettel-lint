import { formatData, invertDictionary, formatLink, fileWikiLinks, collectBacklinks } from "../types.js";
import { RegexCollector } from "./RegexCollector.js";

export class WikiCollector extends RegexCollector {
  public extractAll(files: fileWikiLinks[]): Map<string, formatData[]> {
    const result = new Map<string, formatData[]>();
    if (!files) return result;

    // Performance optimization: Avoid intermediate filter/map array allocations and
    // redundant single-file collectBacklinks passes during extractAll indexing.
    const allFormatData: formatData[] = [];
    for (let i = 0; i < files.length; i++) {
      const ref = files[i];
      if (ref.id !== undefined) {
        const baseData = super.extractData(ref);
        const dataItem: formatData = { ...baseData, bag: [] };
        result.set(ref.id, [dataItem]);
        allFormatData.push(dataItem);
      }
    }

    // Single-pass backlink collection across all formatData items
    const bag = collectBacklinks(allFormatData);

    // Performance optimization: Replace nested .forEach closures with indexed loops
    // and hoist Map lookups outside inner loops.
    for (const [k, v] of bag) {
      const targetItems = result.get(k);
      if (targetItems) {
        for (let i = 0; i < targetItems.length; i++) {
          const data = targetItems[i];
          for (let j = 0; j < v.length; j++) {
            data.bag.push(v[j]);
          }
        }
      }
    }

    return result;
  }

  public extractData(ref: fileWikiLinks): formatData {
    var data = super.extractData(ref);
    return {...data, bag: collectBacklinks([data]).get(ref.filename ?? "") ?? []}
  }
  protected format(references: formatData[]): string {
    var backList: { [target: string]: string[]; } = invertDictionary(references);

    return references.map(r => "* " + formatLink(r) + " = `" + r.filename + "`:\n  * " + (r.data.length > 0 ? r.data : "No links") + "\n  * " + (backList["[" + (r.id ?? "") + "]"] ?? "No backlinks")).join("\n");
  }
  readonly dataName = "Links";
  readonly regex = /(?:\[\d{8,14}\])|(?:\[\[[A-Za-z0-9-]*\]\])/g;
}
