import { formatData, invertDictionary, formatLink, fileWikiLinks, collectBacklinks } from "../types.js";
import { RegexCollector } from "./RegexCollector.js";

export class WikiCollector extends RegexCollector {
  public extractAll(files: fileWikiLinks[]): Map<string, formatData[]> {
    const result = new Map<string, formatData[]>();
    if (!files) return result;

    // Performance optimization: Use indexed loops and direct array collection
    // to avoid intermediate .filter(), .map(), and [...result.values()].flat() array allocations.
    const allData: formatData[] = [];
    for (let i = 0; i < files.length; i++) {
      const ref = files[i];
      if (ref.id != null) {
        const data = this.extractData(ref);
        result.set(ref.id, [data]);
        allData.push(data);
      }
    }

    const bag = collectBacklinks(allData);
    bag.forEach((backlinkList, targetKey) => {
      const targetDatas = result.get(targetKey);
      if (targetDatas) {
        for (let i = 0; i < targetDatas.length; i++) {
          const data = targetDatas[i];
          for (let j = 0; j < backlinkList.length; j++) {
            data.bag.push(backlinkList[j]);
          }
        }
      }
    });

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
