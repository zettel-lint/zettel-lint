import { formatData, invertDictionary, formatLink, fileWikiLinks } from "./types";
import { RegexCollector } from "./RegexCollector";
import { exception } from "console";

export class WikiCollector extends RegexCollector {
  public extractAll(files: fileWikiLinks[]): Map<string, formatData[]> {
    var result = new Map<string, formatData[]>();
    
    files
      ?.filter(ref => ref.filename != undefined)
      .map(ref => result.set(ref.filename ?? "", [{...this.extractData(ref)}]));
    const bag = invertDictionary([...result.values()].flat());
    
    return result;
  }
  public extractData(ref: fileWikiLinks): formatData {
    var data = super.extractData(ref);
    return {...data, bag: invertDictionary([data])}
  }  
  protected format(references: formatData[]): string {
    var backList: { [target: string]: string[]; } = invertDictionary(references);

    return references.map(r => "* " + formatLink(r) + " = `" + r.filename + "`:\n  * " + (r.data.length > 0 ? r.data : "No links") + "\n  * " + (backList["[" + (r.id ?? "") + "]"] ?? "No backlinks")).join("\n");
  }
  readonly dataName = "Links";
  readonly regex = /(?:\[\d{8,14}\])|(?:\[\[[a-zA-z0-9-]*\]\])/g;
}
