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
    const frontMatter = content.match(/^\uFEFF?---[ \t]*\r?\n(?:[^\n]*\n)*?(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/)?.[0] ?? "";
    const body = content.slice(frontMatter.length);
    const openingFence = /^ {0,3}(`{3,}|~{3,})([^\r\n]*)(?:\r?\n|$)/gm;
    let result = frontMatter;
    let proseStart = 0;
    let opening: RegExpExecArray | null;

    while ((opening = openingFence.exec(body)) !== null) {
      const fence = opening[1];
      // Backtick fence info strings cannot contain backticks.
      if (fence[0] === "`" && opening[2].includes("`")) continue;

      const closingFence = new RegExp(`^ {0,3}${fence[0]}{${fence.length},}[ \\t]*(?:\\r?\\n|$)`, "gm");
      closingFence.lastIndex = openingFence.lastIndex;
      const closing = closingFence.exec(body);
      const codeEnd = closing ? closingFence.lastIndex : body.length;

      result += this.fixProse(body.slice(proseStart, opening.index));
      result += body.slice(opening.index, codeEnd);
      proseStart = codeEnd;
      openingFence.lastIndex = codeEnd;
    }

    return result + this.fixProse(body.slice(proseStart));
  }

  private fixProse(content: string): string {
    // Match whole code spans first; closing backtick runs must have the same length.
    const codeOrLink = /(?<!`)(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)|(?<!\[)\[\d+\](?!\])/g;
    return content.replace(codeOrLink, (match) => {
      return this.links[match] ?? match;
    });
  }
}
