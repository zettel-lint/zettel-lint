import { BaseRule } from "./BaseRule.js";
import { idFromFilename } from "../file-handling.js";
import { relative } from "node:path";

export class IdToWikiLinksRule extends BaseRule {
  readonly name = "id-to-wiki-links";
  private links: { [id: string]: string } = {};

  constructor(links: { [id: string]: string } = {}) {
    super();
    this.links = links;
  }

  public setLinkMap(links: { [id: string]: string }): void {
    this.links = links;
  }

  /**
   * Builds the mapping from numeric bracketed IDs (e.g. `[20230901]`) to wiki links (e.g. `[[path/to/file]]`).
   */
  public static buildLinkMap(files: string[], rootPath: string): { [id: string]: string } {
    const links: { [id: string]: string } = {};

    files.forEach(f => {
      const id = idFromFilename(f);
      if (id && id.trim() !== "") {
        let relPath = relative(rootPath, f).replace(/\\/g, "/");
        if (relPath.endsWith(".md")) {
          relPath = relPath.slice(0, -3);
        }
        links["[" + id + "]"] = "[[" + relPath + "]]";
      }
    });

    return links;
  }

  fix(content: string, filePath: string): string {
    if (!content) return content;

    let frontmatter = "";
    let body = content;

    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (frontmatterMatch) {
      frontmatter = frontmatterMatch[1];
      body = content.slice(frontmatterMatch[0].length);
    }

    let updatedFrontmatter = frontmatter;
    const eol = content.includes("\r\n") ? "\r\n" : "\n";

    if (frontmatterMatch) {
      const lines = frontmatter.split(/\r?\n/);
      const newLines: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Match line like: key: [id1, id2]
        const keyBracketMatch = line.match(/^(\s*[\w.-]+\s*:)\s*\[([^\]]+)\]\s*$/);
        if (keyBracketMatch) {
          const keyPrefix = keyBracketMatch[1];
          const rawItems = keyBracketMatch[2].split(",").map(s => s.trim().replace(/^['"]|['"]$/g, ""));

          let hasResolvableId = false;
          const blockItems: string[] = [];

          for (const item of rawItems) {
            const cleanId = item.replace(/^\[|\]$/g, "");
            const mapped = this.links["[" + cleanId + "]"];
            if (mapped) {
              hasResolvableId = true;
              blockItems.push(`  - "${mapped}"`);
            } else {
              blockItems.push(`  - ${item}`);
            }
          }

          if (hasResolvableId) {
            newLines.push(keyPrefix);
            newLines.push(...blockItems);
            continue;
          }
        }
        newLines.push(line);
      }

      updatedFrontmatter = newLines.join(eol);
    }

    // Process body (or whole document if no frontmatter)
    const linkRegex = /(?<!\[)\[(\d+)\](?!\])/g;

    let updatedBody = body.replace(linkRegex, (match, id) => {
      const mapped = this.links["[" + id + "]"];
      return mapped ? mapped : match;
    });

    if (frontmatterMatch) {
      const trailingSep = frontmatterMatch[0].slice(frontmatterMatch[0].lastIndexOf("---"));
      return `---${eol}${updatedFrontmatter}${eol}${trailingSep}` + updatedBody;
    }

    return updatedBody;
  }
}
