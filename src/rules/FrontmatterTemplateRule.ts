import { randomUUID } from "node:crypto";
import { parseDocument, stringify, visit } from "yaml";
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
		// Preserve notes with a complete pair of exact frontmatter delimiters.
		if (/^---\r?\n(?:[\s\S]*?\r?\n)?---(?:\r?\n|$)/.test(content)) {
			return content;
		}

		// Extract title from first `# Title` header, or fallback to file basename without extension
		let titleMatch: RegExpMatchArray | null = null;
		let fence: string | undefined;
		for (const line of content.split(/\r?\n/)) {
			const delimiter = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
			if (fence) {
				if (delimiter && delimiter[1][0] === fence[0] &&
					delimiter[1].length >= fence.length && /^[ \t]*$/.test(delimiter[2])) {
					fence = undefined;
				}
				continue;
			}
			if (delimiter && (delimiter[1][0] === "~" || !delimiter[2].includes("`"))) {
				fence = delimiter[1];
				continue;
			}
			titleMatch = line.match(/^#\s+(.+)$/);
			if (titleMatch) break;
		}
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
			// Insert the title after parsing so YAML handles quoting, not HTML escaping.
			const titleMarker = `FRONTMATTER_TITLE_${randomUUID()}`;
			templator.viewProps.title = titleMarker;
			templator.viewProps.modified = today;
			const templated = templator.render(rawTemplate);

			const parsed = parseDocument(templated);
			if (parsed.errors.length > 0) throw parsed.errors[0];
			visit(parsed, {
				Scalar(_key, node) {
					if (typeof node.value === "string") {
						node.value = node.value.replaceAll(titleMarker, () => title);
					}
				},
			});
			frontmatterYaml = `---\n${stringify(parsed.toJS())}---\n`;
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
