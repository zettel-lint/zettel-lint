import { formatData, invertDictionary, formatLink, fileWikiLinks, collectBacklinks } from "./types";
import { RegexCollector } from "./RegexCollector";

export class WikiCollector extends RegexCollector {
  public extractAll(files: fileWikiLinks[]): Map<string, formatData[]> {
    var result = new Map<string, formatData[]>();
    
    files
      ?.filter(ref => ref.id != undefined)
      .map(ref => result.set(ref.id ?? "", [{...this.extractData(ref)}]));
    const bag = collectBacklinks([...result.values()].flat());
    bag.forEach((v, k) => v.forEach(n => result.get(k)?.forEach(data => data.bag.push(n))));
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
  readonly regex = /(?:\[\d{8,14}\])|(?:\[\[[a-zA-z0-9-]*\]\])/g;
}
