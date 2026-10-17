import { describe, expect, it } from "vitest";
import { IdToWikiLinksRule } from "../../rules/IdToWikiLinksRule.js";

describe("IdToWikiLinksRule", () => {
	const linkMap = {
		"[00000000]": "[[00000000-dummy-file]]",
		"[00000001]": "[[sub/00000001-another-file]]",
		"[20230901]": "[[20230901-note]]",
	};

	const rule = new IdToWikiLinksRule(linkMap);

	it("converts resolvable numeric [id] links to wiki-links in body", () => {
		const input = "This points to [00000000] and also [20230901].";
		const expected =
			"This points to [[00000000-dummy-file]] and also [[20230901-note]].";

		expect(rule.fix(input, "test.md")).toBe(expected);
	});

	it("converts resolvable numeric [id] links in YAML frontmatter into block-style arrays", () => {
		const input = `---
title: Readme
references: [00000001]
notes: YAML top matter is supported
---

Body link: [00000000]
`;

		const expected = `---
title: Readme
references:
  - "[[sub/00000001-another-file]]"
notes: YAML top matter is supported
---

Body link: [[00000000-dummy-file]]
`;

		expect(rule.fix(input, "test.md")).toBe(expected);
	});

	it("leaves unresolved numeric links unchanged", () => {
		const input = "This link [99999999] is unresolved.";
		expect(rule.fix(input, "test.md")).toBe(input);
	});

	it("leaves existing wiki-links unchanged", () => {
		const input =
			"Already a wiki link: [[00000000-dummy-file]] and [[existing-note]].";
		expect(rule.fix(input, "test.md")).toBe(input);
	});

	it.each([
		"![00000000](image.png)",
		"![An image of [00000000]](image.png)",
		"![00000000][image]",
		"![00000000]",
		"[00000000](note.md)",
		"[label][00000000]",
		"[00000000][label]",
		"[[00000000]]",
		"\\[00000000]",
		"`[00000000]`",
		"``code `[00000000]` code``",
		"`code\n[00000000]`",
		"```md\n[00000000]\n```",
		"~~~md\n[00000000]\n~~~",
		"   ```md\n[00000000]\n   ````",
		"````md\n```\n[00000000]\n````",
		"~~~md\n```\n[00000000]\n~~~",
		"```md\r\n[00000000]\r\n```",
	])("preserves Markdown context in %j while converting nearby links", (protectedText: string) => {
		const input = `[20230901]\n${protectedText}\n[00000001]`;
		const expected = `[[20230901-note]]\n${protectedText}\n[[sub/00000001-another-file]]`;

		expect(rule.fix(input, "test.md")).toBe(expected);
		expect(rule.fix(expected, "test.md")).toBe(expected);
	});

	it("leaves an unclosed fenced code block unchanged through the end of the document", () => {
		const input = "[20230901]\n```md\n[00000000]\n[00000001]";
		const expected = "[[20230901-note]]\n```md\n[00000000]\n[00000001]";

		expect(rule.fix(input, "test.md")).toBe(expected);
	});

	it("is idempotent on a second fix pass", () => {
		const input = `---
title: Readme
references: [00000001]
---

Link [00000000] and unresolved [99999999].
`;

		const firstPass = rule.fix(input, "test.md");
		const secondPass = rule.fix(firstPass, "test.md");

		expect(secondPass).toBe(firstPass);
	});

	it("builds link mapping correctly from file paths", () => {
		const files = [
			"notes/00000000-dummy-file.md",
			"notes/sub/00000001-another-file.md",
		];
		const generatedMap = IdToWikiLinksRule.buildLinkMap(files, "notes");

		expect(generatedMap["[00000000]"]).toBe("[[00000000-dummy-file]]");
		expect(generatedMap["[00000001]"]).toBe("[[sub/00000001-another-file]]");
	});
});
