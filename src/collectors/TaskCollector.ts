import { type formatData, formatLink } from "../types.js";
import { RegexCollector } from "./RegexCollector.js";

export class TaskCollector extends RegexCollector {
	protected shouldCollect(_filename: string): boolean {
		return this.programArgs.taskDisplay !== "none";
	}

	protected format(references: formatData[]): string {
		switch (this.programArgs.taskDisplay as string) {
			case "by-priority":
				return this.formatSortByPriority(references);
			case "by-file":
				return this.formatGroupByFilename(references);
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
				const suffix = `${this.projectFromFilename(ref.filename)} => ${formatLink(ref)}`;
				for (let j = 0; j < tags.length; j++) {
					tasks.push(tags[j] + suffix);
				}
			}
		}
		return tasks;
	}

	protected projectFromFilename(filename: string | undefined): string {
		if (filename == null || filename.length === 0) {
			return "";
		}
		return ` +${filename.substring(0, filename.lastIndexOf("."))}`;
	}

	// Priority order: (A)-(Z) -> [ ] checklist -> unprioritized/other
	// Within the same priority, sort by due:YYYY-MM-DD (earliest first, no due date last)
	protected static compareTasks(a: string, b: string): number {
		const getPriorityRank = (t: string): string => {
			const m = /^\(([A-Z])\)/.exec(t);
			if (m) return `0_${m[1]}`;
			if (t.startsWith("[ ]")) return "1";
			return "2";
		};
		const rankA = getPriorityRank(a);
		const rankB = getPriorityRank(b);
		if (rankA !== rankB) return rankA.localeCompare(rankB);

		const dueA = /due:(\d{4}-\d{2}-\d{2})/.exec(a)?.[1] ?? "9999-99-99";
		const dueB = /due:(\d{4}-\d{2}-\d{2})/.exec(b)?.[1] ?? "9999-99-99";
		if (dueA !== dueB) return dueA.localeCompare(dueB);

		return a.localeCompare(b);
	}

	protected formatSortByPriority(references: formatData[]): string {
		const allTasks = this.getTasks(references).sort(TaskCollector.compareTasks);
		return `${allTasks.map((r) => `\n* ${r}`).join("\n")}`;
	}

	protected formatGroupByFilename(references: formatData[]): string {
		return (
			"" +
			references
				.filter((r) => r.data.length > 0)
				.map(
					(r) =>
						"\n\n### " +
						r.title +
						" [" +
						r.filename +
						"](./" +
						r.filename +
						")\n\n" +
						"<details>\n\n* " +
						r.data.join("\n* ") +
						"\n\n</details>",
				)
				.join("\n")
		);
	}
	readonly dataName = "Tasks";
	// Regex:
	// Find lines starting "[ ]", "1 [ ]", "- [ ]" or "* [ ]" or "(A)" for checklist or todo.txt tasks
	// OR
	// Find lines with a todo.txt style +project-reference
	readonly regex =
		/(?:^[\s]*[*\-\d]?[\s]*((?:(?:\[ \])|(?:\([A-Z]\))).*)$)|(?:^.*[ ^]\+\d{8,14}.*$)/gm;

	public collect(content: string): string[] {
		return super.collect(content);
	}
}
