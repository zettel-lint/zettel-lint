import { BaseRule } from "./BaseRule.js";

/** Links real standalone ISO dates in note text to daily notes. */
export class LinkDatesRule extends BaseRule {
	readonly name = "link-dates";

	fix(content: string, _filePath: string): string {
		const excluded = new Uint8Array(content.length);
		const protect = (start: number, end: number) =>
			excluded.fill(1, start, end);
		const frontmatter =
			/^(?:\uFEFF)?---[ \t]*\r?\n[\s\S]*?^(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/m;
		// Frontmatter must start the document, not an arbitrary later line.
		const header = frontmatter.exec(content);
		if (header?.index === 0) protect(0, header[0].length);

		let fence: { marker: string; length: number; start: number } | undefined;
		for (const line of content.matchAll(/^.*(?:\n|$)/gm)) {
			const lineIndex = line.index ?? 0;
			if (!line[0] || excluded[lineIndex]) continue;
			const marker = /^ {0,3}(`{3,}|~{3,})(.*?)(?:\r?\n|$)/.exec(line[0]);
			if (fence) {
				if (
					marker &&
					marker[1][0] === fence.marker &&
					marker[1].length >= fence.length &&
					marker[2].trim() === ""
				) {
					protect(fence.start, lineIndex + line[0].length);
					fence = undefined;
				}
			} else if (marker && (marker[1][0] !== "`" || !marker[2].includes("`"))) {
				fence = {
					marker: marker[1][0],
					length: marker[1].length,
					start: lineIndex,
				};
			}
		}
		if (fence) protect(fence.start, content.length);

		// Match backtick runs of the same length; shorter runs can occur inside code.
		const ticks = /`+/g;
		let opening = ticks.exec(content);
		while (opening !== null) {
			let backslashes = 0;
			for (let i = opening.index - 1; i >= 0 && content[i] === "\\"; i--) backslashes++;
			if (excluded[opening.index] || backslashes % 2 === 1) {
				opening = ticks.exec(content);
				continue;
			}
			const afterOpening = ticks.lastIndex;
			let closing = ticks.exec(content);
			while (closing !== null) {
				if (
					!excluded[closing.index] &&
					closing[0].length === opening[0].length
				) {
					protect(opening.index, ticks.lastIndex);
					break;
				}
				closing = ticks.exec(content);
			}
			if (!closing) ticks.lastIndex = afterOpening;
			opening = ticks.exec(content);
		}

		const brackets: number[] = [];
		for (let i = 0; i < content.length; i++) {
			if (excluded[i]) continue;
			if (content[i] === "\\") {
				i++;
				continue;
			}
			if (content[i] === "[") brackets.push(i);
			if (content[i] !== "]" || brackets.length === 0) continue;
			const openBracket = brackets.pop();
			if (openBracket !== undefined) {
				protect(openBracket, i + 1);
			}
			// Markdown destinations can contain balanced parentheses and escaped delimiters.
			if (content[i + 1] === "(") {
				let depth = 1;
				let end = i + 2;
				for (; end < content.length && depth; end++) {
					if (content[end] === "\\") {
						end++;
						continue;
					}
					if (content[end] === "(") depth++;
					if (content[end] === ")") depth--;
				}
				if (depth === 0) protect(i + 1, end);
			}
		}

		// Cover bare URLs, autolinks, and reference-link destinations.
		for (const url of content.matchAll(
			/\b[a-z][a-z\d+.-]*:\/\/[^\s<>]+|\bwww\.[^\s<>]+|^ {0,3}\[[^\]\r\n]+\]:[ \t]*\S+/gim,
		)) {
			const urlIndex = url.index ?? 0;
			protect(urlIndex, urlIndex + url[0].length);
		}

		// Protect markup (including quoted > characters), but keep element text eligible.
		for (const markup of content.matchAll(
			/<!--[\s\S]*?(?:-->|$)|<\/?[a-z][a-z\d:-]*(?=[\s/>])(?:[^>"']|"[^"]*"|'[^']*')*>|<\?[\s\S]*?\?>|<![A-Z][^>]*>/gi,
		)) {
			protect(markup.index, markup.index + markup[0].length);
		}

		return content.replace(
			/(?<![\[\/\\.])\b(\d{4}-\d{2}-\d{2})\b(?![\]\/\\]|\.[\p{L}\p{N}_])/gu,
			(date, _capture, offset: number) => {
				if (excluded[offset]) return date;
				const [year, month, day] = date.split("-").map(Number);
				const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
				const days = [
					31,
					leap ? 29 : 28,
					31,
					30,
					31,
					30,
					31,
					31,
					30,
					31,
					30,
					31,
				];
				return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]
					? `[[${date}]]`
					: date;
			},
		);
	}
}
