import { parse, stringify } from "yaml";
import { Templator } from "../Templator.js";
import { BaseRule } from "./BaseRule.js";

export class FrontmatterTemplateRule extends BaseRule {
	readonly name = "frontmatter-template";
	private customTemplate?: string;

	constructor(customTemplate?: string) {
		super();
		this.customTemplate = customTemplate;
	}

	fix(content: string, filePath: string): string {
		// Fast path: if the document already begins with YAML frontmatter delimiter, skip
		if (content.startsWith("---")) {
			return content;
		}

		// Extract title from first `# Title` header, or fallback to file basename without extension
		const titleMatch = content.match(/^#\s+(.+)$/m);
		const lastSlash = Math.max(
			filePath.lastIndexOf("/"),
			filePath.lastIndexOf("\\"),
		);
		const filename =
			lastSlash !== -1 ? filePath.slice(lastSlash + 1) : filePath;
		const lastDot = filename.lastIndexOf(".");
		const baseName = lastDot !== -1 ? filename.slice(0, lastDot) : filename;
		const title = titleMatch ? titleMatch[1].trim() : baseName;

		// ISO 8601 YYYY-MM-DD for today's modified date
		const today = new Date().toISOString().slice(0, 10);

		let frontmatterYaml: string;
		if (this.customTemplate) {
			// Normalize if template already has --- delimiters or not
			let rawTemplate = this.customTemplate.trim();
			if (rawTemplate.startsWith("---")) {
				rawTemplate = rawTemplate
					.replace(/^---\r?\n?/, "")
					.replace(/\r?\n?---$/, "");
			}

			const templator = new Templator();
			templator.viewProps.title = title;
			templator.viewProps.modified = today;
			const templated = templator.render(rawTemplate);

			try {
				const parsed = parse(templated);
				frontmatterYaml = `---\n${stringify(parsed)}---\n`;
			} catch {
				// Fallback: wrap raw templated string with delimiters
				frontmatterYaml = `---\n${templated.trim()}\n---\n`;
			}
		} else {
			const defaultData = {
				title: [title],
				modified: [today],
			};
			frontmatterYaml = `---\n${stringify(defaultData)}---\n`;
		}

		return `${frontmatterYaml}${content}`;
	}
}
