import { relative } from "node:path";
import { idFromFilename } from "../file-handling.js";
import { BaseRule } from "./BaseRule.js";

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
	public static buildLinkMap(
		files: string[],
		rootPath: string,
	): { [id: string]: string } {
		const links: { [id: string]: string } = {};

		files.forEach((f) => {
			const id = idFromFilename(f);
			if (id && id.trim() !== "") {
				let relPath = relative(rootPath, f).replace(/\\/g, "/");
				if (relPath.endsWith(".md")) {
					relPath = relPath.slice(0, -3);
				}
				links[`[${id}]`] = `[[${relPath}]]`;
			}
		});

		return links;
	}

	fix(content: string, _filePath: string): string {
		if (!content) return content;

		let frontmatter = "";
		let body = content;

		const frontmatterMatch = content.match(
			/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/,
		);
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
				const keyBracketMatch = line.match(
					/^(\s*[\w.-]+\s*:)\s*\[([^\]]+)\]\s*$/,
				);
				if (keyBracketMatch) {
					const keyPrefix = keyBracketMatch[1];
					const rawItems = keyBracketMatch[2]
						.split(",")
						.map((s) => s.trim().replace(/^['"]|['"]$/g, ""));

					let hasResolvableId = false;
					const blockItems: string[] = [];

					for (const item of rawItems) {
						const cleanId = item.replace(/^\[|\]$/g, "");
						const mapped = this.links[`[${cleanId}]`];
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

		const updatedBody = this.replaceBodyLinks(body);

		if (frontmatterMatch) {
			const trailingSep = frontmatterMatch[0].slice(
				frontmatterMatch[0].lastIndexOf("---"),
			);
			return `---${eol}${updatedFrontmatter}${eol}${trailingSep}${updatedBody}`;
		}

		return updatedBody;
	}

	private replaceBodyLinks(body: string): string {
		// Consume escapes, code spans and complete bracket constructs before
		// considering a bare numeric link for replacement.
		const inlineTokens = /\\[\s\S]|(?<!`)(`+)(?!`)([\s\S]*?[^`])\1(?!`)|!?\[(?:\\[\s\S]|[^\[\]\\]|\[[^\[\]]*\])*\](?:\([^\)\r\n]*\)|\[[^\]\r\n]*\])?/g;
		const replaceInline = (text: string): string =>
			text.replace(inlineTokens, (match) =>
				/^\[\d+\]$/.test(match) ? (this.links[match] ?? match) : match,
			);

		let fence: string | undefined;
		let start = 0;
		let updated = "";
		const fenceLines = /^ {0,3}(`{3,}|~{3,})([^\r\n]*)\r?$/gm;

		for (const match of body.matchAll(fenceLines)) {
			const marker = match[1];
			if (!fence) {
				// Backtick fence info strings cannot contain backticks.
				if (marker[0] === "`" && match[2].includes("`")) continue;
				updated += replaceInline(body.slice(start, match.index));
				start = match.index;
				fence = marker;
			} else if (
				marker[0] === fence[0] &&
				marker.length >= fence.length &&
				match[2].trim() === ""
			) {
				const end = match.index + match[0].length;
				updated += body.slice(start, end);
				start = end;
				fence = undefined;
			}
		}

		const remaining = body.slice(start);
		return updated + (fence ? remaining : replaceInline(remaining));
	}
}
