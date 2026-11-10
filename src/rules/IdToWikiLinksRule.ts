import { relative } from "node:path";
import { isScalar, isSeq, parseDocument, stringify } from "yaml";
import { idFromFilename } from "../file-handling.js";
import { BaseRule } from "./BaseRule.js";

function yamlScalar(value: unknown): string {
	if (typeof value === "string") {
		return JSON.stringify(value);
	}
	return stringify(value).trimEnd();
}

function mapId(value: unknown, links: { [id: string]: string }): unknown {
	if (typeof value === "string") {
		const bracketedId = value.match(/^\[(\d+)\]$/)?.[1];
		const id = bracketedId ?? (/^\d+$/.test(value) ? value : undefined);
		return id ? (links[`[${id}]`] ?? value) : value;
	}
	if (typeof value === "number" && /^\d+$/.test(String(value))) {
		return links[`[${value}]`] ?? value;
	}
	return value;
}

function mapYamlScalar(
	node: { value: unknown; source?: string },
	links: { [id: string]: string },
): unknown {
	if (typeof node.value === "number" && node.source && /^\d+$/.test(node.source)) {
		return links[`[${node.source}]`] ?? node.value;
	}
	return mapId(node.value, links);
}

function replaceBodyLinks(body: string, links: { [id: string]: string }): string {
	const lines = body.split(/(\r?\n)/);
	let fence: { character: string; length: number } | undefined;

	for (let i = 0; i < lines.length; i += 2) {
		const line = lines[i];
		const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
		if (fenceMatch) {
			const marker = fenceMatch[1];
			if (!fence) {
				fence = { character: marker[0], length: marker.length };
				continue;
			}
			if (marker[0] === fence.character && marker.length >= fence.length) {
				fence = undefined;
				continue;
			}
		}
		if (fence) continue;

		let result = "";
		let lastIndex = 0;
		const codeSpan = /(`+).*?\1/g;
		let codeMatch: RegExpExecArray | null;
		while ((codeMatch = codeSpan.exec(line)) !== null) {
			result += replacePlainLinks(line.slice(lastIndex, codeMatch.index), links);
			result += codeMatch[0];
			lastIndex = codeMatch.index + codeMatch[0].length;
		}
		lines[i] = result + replacePlainLinks(line.slice(lastIndex), links);
	}
	return lines.join("");
}

function replacePlainLinks(text: string, links: { [id: string]: string }): string {
	return text.replace(/(?<![\[!])\[(\d+)\](?![\[\]\(])/g, (match, id: string, offset: number, source: string) => {
		const mapped = links[`[${id}]`];
		const precededByLinkClose = source[offset - 1] === "]";
		return mapped && !precededByLinkClose ? mapped : match;
	});
}

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
			if (/^\d+$/.test(id)) {
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
				// Parse flow arrays instead of splitting on commas, which corrupts quoted values.
				const keyBracketMatch = line.match(
					/^(\s*[\w.-]+\s*:)\s*(\[[\s\S]*\])(\s*(?:#.*)?)$/,
				);
				if (keyBracketMatch) {
					const keyPrefix = keyBracketMatch[1];
					const document = parseDocument(keyBracketMatch[2]);
					if (document.errors.length > 0) throw document.errors[0];
					const sequence = document.contents;
					if (isSeq(sequence) && sequence.items.every(isScalar)) {
						const mappedValues = sequence.items.map((item) => mapYamlScalar(item, this.links));
						const hasChanges = mappedValues.some((value, index) => value !== sequence.items[index].value);
						if (hasChanges) {
							const indent = /^(\s*)/.exec(line)?.[1] ?? "";
							newLines.push(`${keyPrefix}${keyBracketMatch[3]}`);
							newLines.push(...mappedValues.map((value) => `${indent}  - ${yamlScalar(value)}`));
							continue;
						}
					}
				}
				const sequenceMatch = line.match(/^(\s*-\s*)(.*?)(\s+#.*)?$/);
				if (sequenceMatch) {
					const document = parseDocument(sequenceMatch[2]);
					if (document.errors.length > 0) throw document.errors[0];
					const node = document.contents;
					if (isScalar(node)) {
						const mapped = mapYamlScalar(node, this.links);
						if (mapped !== node.value) {
							newLines.push(`${sequenceMatch[1]}${yamlScalar(mapped)}${sequenceMatch[3] ?? ""}`);
							continue;
						}
					}
				}
				newLines.push(line);
			}

			updatedFrontmatter = newLines.join(eol);
		}

		// Process body (or whole document if no frontmatter)
		const updatedBody = replaceBodyLinks(body, this.links);

		if (frontmatterMatch) {
			const trailingSep = frontmatterMatch[0].slice(
				frontmatterMatch[0].lastIndexOf("---"),
			);
			return `---${eol}${updatedFrontmatter}${eol}${trailingSep}${updatedBody}`;
		}

		return updatedBody;
	}
}
