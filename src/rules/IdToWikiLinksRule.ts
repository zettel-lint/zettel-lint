import { idFromFilename } from "../file-handling.js";
import type { FilePath } from "../file-system.js";
import { BaseRule } from "./BaseRule.js";

export class IdToWikiLinksRule extends BaseRule {
  static readonly ruleName = "id-to-wiki-links";
  readonly name = IdToWikiLinksRule.ruleName;
  private readonly linksById: ReadonlyMap<string, string>;

  constructor(files: FilePath[], rootPath: FilePath) {
    super();
    const rootPrefix = rootPath ? `${rootPath}/` : "";
    const linksById = new Map<string, string>();

    for (const file of files) {
      const id = idFromFilename(file);
      if (!id) {
        continue;
      }

      const relativePath = rootPrefix && file.startsWith(rootPrefix)
        ? file.slice(rootPrefix.length)
        : file;
      linksById.set(id, `[[${relativePath.replace(/\.md$/, "")}]]`);
    }

    this.linksById = linksById;
  }

  fix(content: string, _filePath: string): string {
    return content.replace(/\[\[[\s\S]*?\]\]|(?<!\[)\[(\d{8,14})\](?!\])/g, (match, id?: string) =>
      id ? this.linksById.get(id) ?? match : match
    );
  }
}
