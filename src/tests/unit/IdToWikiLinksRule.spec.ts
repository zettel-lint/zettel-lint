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

	it("rejects nonnumeric filenames and supplied mappings", () => {
		expect(IdToWikiLinksRule.buildLinkMap(["notes/active-note.md"], "notes")).toEqual({});
		const input = "---\nstatus: [active]\nreferences: [active, 00000001]\n---\n[active]";
		const custom = new IdToWikiLinksRule({ ...linkMap, "[active]": "[[active-note]]" });
		expect(custom.fix(input, "")).toContain("status: [active]");
		expect(custom.fix(input, "")).toContain("  - active");
		expect(custom.fix(input, "")).not.toContain("[[active-note]]");
		custom.setLinkMap({ "[active]": "[[active-note]]" });
		expect(custom.fix(input, "")).toBe(input);
	});

	it("preserves nested flow and sequence references as YAML children", () => {
		const input = '---\nmetadata:\n  references: ["[00000001]", "active"]\n  other:\n    - "[20230901]" # note\n    - "[99999999]"\n---\n';
		const output = rule.fix(input, "");
		expect(output).toContain('  references:\n    - "[[sub/00000001-another-file]]"\n    - "active"');
		expect(output).toContain('    - "[[20230901-note]]" # note');
		expect(output).toContain('    - "[99999999]"');
		expect(rule.fix(output, "")).toBe(output);
	});
});
