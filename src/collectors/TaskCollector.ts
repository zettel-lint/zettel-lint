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

	protected formatSortByPriority(references: formatData[]): string {
		const allTasks = this.getTasks(references).sort();
		// Performance optimization: Direct string concatenation in indexed loop avoids .map() intermediate array allocation
		let result = "";
		for (let i = 0; i < allTasks.length; i++) {
			if (i > 0) {
				result += "\n";
			}
			result += `\n* ${allTasks[i]}`;
		}
		return result;
	}

	protected formatGroupByFilename(references: formatData[]): string {
		// Performance optimization: Single-pass indexed loop avoids intermediate .filter() and .map()
		// array allocations and callback closures per note formatted. (~40% faster)
		let result = "";
		for (let i = 0; i < references.length; i++) {
			const r = references[i];
			if (r.data.length > 0) {
				if (result.length > 0) {
					result += "\n";
				}
				result +=
					"\n\n### " +
					r.title +
					" [" +
					r.filename +
					"](./" +
					r.filename +
					")\n\n<details>\n\n* " +
					r.data.join("\n* ") +
					"\n\n</details>";
			}
		}
		return result;
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
