import { formatData } from "./types";
import { RegexCollector, collectMatches } from "./RegexCollector";

export class TaskCollector extends RegexCollector {
  protected format(references: formatData[]): string {
    return "" +
      references
        .filter(r => r.data.length > 0)
        .map(r => "\n\n### " + r.title + " [" + r.filename + "](./" + r.filename + "):\n\n<details>\n\n* " + r.data.join("\n* ") + "\n\n</details>").join("\n");
  }
  readonly dataName = "Tasks";
  // Regex:
  // Find lines starting "[ ]" or "* [ ]" or "(A)" for checklist or todo.txt tasks
  // OR
  // Find lines with a todo.txt style +project-reference
  readonly regex = /(?:^[\s\*]*((?:(?:\[ \])|(?:\([A-Z]\))).*)$)|(?:^.*[ ^]\+\d{8,14}.*$)/gm;

  public collect(content: string): string[] {
    return super.collect(content);
  }
}
