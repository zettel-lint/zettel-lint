import { fileWikiLinks, formatData, formatLink } from "./types.js";
import { RegexCollector } from "./RegexCollector.js";
import { idFromFilename } from "./file-handling.js";

export class OrphanCollector extends RegexCollector {
  private fileIds: Set<string> = new Set();

  public extractAll(files: fileWikiLinks[]): Map<string, formatData[]> {
    // First collect all valid file IDs
    this.fileIds = new Set(files.map(f => idFromFilename(f.fullpath ?? f.filename ?? "")));

    var result = new Map<string, formatData[]>();
    files
      ?.filter(ref => ref.filename != undefined)
      .map(ref => {
        const orphans = this.findOrphans(ref);
        if (orphans.length > 0) {
          result.set(ref.filename ?? "", [this.extractData(ref)]);
        }
      });
    return result;
  }

  private findOrphans(file: fileWikiLinks): string[] {
    const matches = this.collector(
      file.filename ?? "",
      file.matchData?.WikiCollector?.join("\n") ?? "",
      null
    );
    return matches.filter(link => {
      // Remove brackets and check if ID exists
      const id = link.replace(/[\[\]]/g, "");
      return !this.fileIds.has(id);
    });
  }

  protected format(references: formatData[]): string {
    return references
      .filter(r => r.data.length > 0 && r.id !== undefined)
      .map(r => "* " + formatLink(r) + " `" + r.filename + "`: " + r.data.join())
      .join("\n");
  }

  readonly dataName = "Orphans";
  // Match wiki-style links and markdown links without targets
  readonly regex = /\[([^\]]+)\](?:\[\]|\(\))/g;
}
