import { formatData, formatLink, invertDictionary } from "./types";
import { RegexCollector, collectMatches } from "./RegexCollector";

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
    var tasks: string[] = [];

    references.forEach(ref => {
      const tags = ref.data;
      tags.forEach(tag => {
        tasks.push(tag + " +" + ref.id + " => " + formatLink(ref));
      });
    });
    return tasks;
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
