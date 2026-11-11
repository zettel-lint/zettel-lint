import { BaseRule } from "./BaseRule.js";

/**
 * Rule that detects standalone dates in YYYY-MM-DD format and converts them
 * into wiki-links referencing daily notes (e.g., [[YYYY-MM-DD]]).
 */
export class LinkDatesRule extends BaseRule {
  readonly name = "link-dates";

  fix(content: string, _filePath: string): string {
    // Matches standalone YYYY-MM-DD date references not already inside brackets [ ... ]
    return content.replace(/(?<!\[)\b(\d{4}-\d{2}-\d{2})\b(?!\])/g, "[[$1]]");
  }
}
