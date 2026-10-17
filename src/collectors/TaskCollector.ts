import { formatData, formatLink, invertDictionary } from "../types.js";
import { RegexCollector, collectMatches } from "./RegexCollector.js";

export class TaskCollector extends RegexCollector {
  protected shouldCollect(filename: string) : boolean {
    return this.programArgs.taskDisplay !== "none";
  }

  protected format(references: formatData[]): string {
    switch (this.programArgs.taskDisplay as string) {
      case "by-priority": return this.formatSortByPriority(references);
      case "by-file": return this.formatGroupByFilename(references);
    }
    return "";
  }

  protected getTasks(references: formatData[]): string[] {
    const tasks: string[] = [];
    if (!references) return tasks;

    // Performance optimization: Hoist projectFromFilename and formatLink string formatting
    // out of inner loop over tags and use indexed for loops to eliminate iterator allocations.
    for (let i = 0; i < references.length; i++) {
      const ref = references[i];
      const tags = ref.data;
      if (tags && tags.length > 0) {
        const suffix = this.projectFromFilename(ref.filename) + " => " + formatLink(ref);
        for (let j = 0; j < tags.length; j++) {
          tasks.push(tags[j] + suffix);
        }
      }
    }
    return tasks;
  }

  protected projectFromFilename(filename: string | undefined) : string {
    if (filename == null || filename.length == 0) {
      return ""
    }
    return " +" + filename.substring(0, filename.lastIndexOf("."))
  }

  protected formatSortByPriority(references: formatData[]): string {
    const allTasks = this.getTasks(references).sort();
    return "" +
      allTasks
        .map(r => "\n* " + r).join("\n");
  }

  protected formatGroupByFilename(references: formatData[]): string {
    return "" +
      references
        .filter(r => r.data.length > 0)
        .map(r => "\n\n### " + r.title + " [" + r.filename + "](./" + r.filename + ")\n\n" +
          "<details>\n\n* " + r.data.join("\n* ") + "\n\n</details>").join("\n");
  }
  readonly dataName = "Tasks";
  // Regex:
  // Find lines starting "[ ]", "1 [ ]", "- [ ]" or "* [ ]" or "(A)" for checklist or todo.txt tasks
  // OR
  // Find lines with a todo.txt style +project-reference
  readonly regex = /(?:^[\s]*[\*\-\d]?[\s]*((?:(?:\[ \])|(?:\([A-Z]\))).*)$)|(?:^.*[ ^]\+\d{8,14}.*$)/gm;

  public collect(content: string): string[] {
    return super.collect(content);
  }
}
