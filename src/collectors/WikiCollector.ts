import { formatData, invertDictionary, formatLink, fileWikiLinks, collectBacklinks } from "../types.js";
import { RegexCollector } from "./RegexCollector.js";

export class WikiCollector extends RegexCollector {
  public extractAll(files: fileWikiLinks[]): Map<string, formatData[]> {
    const result = new Map<string, formatData[]>();
    if (!files) return result;

    // Performance optimization: Single indexed pass over files eliminates intermediate array
    // allocations from .filter(), .map(), and [...result.values()].flat()
    const extractedList: formatData[] = [];
    for (let i = 0; i < files.length; i++) {
      const ref = files[i];
      if (ref.id !== undefined) {
        const data = this.extractData(ref);
        result.set(ref.id, [data]);
        extractedList.push(data);
      }
    }

    const bag = collectBacklinks(extractedList);
    // Performance optimization: Single-pass Map lookup per key and direct loops replace 3-level
    // nested .forEach closures and repeated Map.get lookups per backlink
    for (const [k, v] of bag.entries()) {
      const targetDataList = result.get(k);
      if (targetDataList) {
        for (let i = 0; i < targetDataList.length; i++) {
          const data = targetDataList[i];
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
