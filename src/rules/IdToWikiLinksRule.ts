import { BaseRule } from "./BaseRule.js";
import { idFromFilename } from "../file-handling.js";
import { relative } from "node:path";

export class IdToWikiLinksRule extends BaseRule {
  readonly name = "id-to-wiki-links";
  private links: Record<string, string> = {};

  constructor(links?: Record<string, string>) {
    super();
    if (links) {
      this.links = links;
    }
  }

  prepare(files: string[], basePath: string): void {
    this.links = {};
    files.forEach((f) => {
      const id = idFromFilename(f);
      if (id && id.trim() !== "") {
        const relPath = relative(basePath, f)
          .replace(/\\/g, "/")
          .replace(/\.md$/, "");
        this.links["[" + id + "]"] = "[[" + relPath + "]]";
      }
    });
  }

  fix(content: string, filePath: string): string {
    const linkRegex = /(?<!\[)\[\d+\](?!\])/g;
    return content.replace(linkRegex, (match) => {
      return this.links[match] ?? match;
    });
  }
}
