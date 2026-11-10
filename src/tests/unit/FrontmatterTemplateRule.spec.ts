import { describe, expect, it } from "vitest";
import { FrontmatterTemplateRule } from "../../rules/FrontmatterTemplateRule.js";
import { InlinePropertiesToFrontmatter } from "../../rules/InlinePropertiesToFrontmatterRule.js";

describe("FrontmatterTemplateRule", () => {
	const today = new Date().toISOString().slice(0, 10);

	it("adds default frontmatter with title from h1 and today as modified date", () => {
		const rule = new FrontmatterTemplateRule();
		const input = "# My Cool Note\nBody content goes here.\n";
		const output = rule.fix(input, "notes/my-cool-note.md");

		expect(output).toContain("title:\n  - My Cool Note\n");
		expect(output).toContain(`modified:\n  - ${today}\n`);
		expect(output).toContain("# My Cool Note\nBody content goes here.\n");
		expect(output.startsWith("---\n")).toBe(true);
	});

	it("falls back to filename without extension if note lacks an h1 title", () => {
		const rule = new FrontmatterTemplateRule();
		const input = "Just a paragraph without heading.\n";
		const output = rule.fix(input, "folder/subfolder/awesome-doc.md");

		expect(output).toContain("title:\n  - awesome-doc\n");
		expect(output).toContain(`modified:\n  - ${today}\n`);
	});

	it("does not modify notes that already have frontmatter", () => {
		const rule = new FrontmatterTemplateRule();
		const input = "---\ntitle: Already Set\n---\n# Some Heading\n";
		const output = rule.fix(input, "test.md");

		expect(output).toBe(input);
	});

	it("supports custom frontmatter template with {{title}} and {{modified}} placeholders", () => {
		const customTemplate = `title: "{{title}}"
modified: "{{modified}}"
tags:
  - note
status: draft`;

		const rule = new FrontmatterTemplateRule(customTemplate);
		const input = "# Custom Title\nDocument text.";
		const output = rule.fix(input, "custom.md");

		expect(output).toContain("title: Custom Title");
		expect(output).toContain(`modified: ${today}`);
		expect(output).toContain("status: draft");
		expect(output).toContain("# Custom Title\nDocument text.");
	});

	it("supports custom template with existing --- fences", () => {
		const customTemplate = `---
title: "{{title}}"
date: "{{modified}}"
---`;

		const rule = new FrontmatterTemplateRule(customTemplate);
		const input = "# Fenced Template\nText";
		const output = rule.fix(input, "fenced.md");

		expect(output).toContain("title: Fenced Template");
		expect(output).toContain(`date: ${today}`);
	});

	it("combines with InlinePropertiesToFrontmatter in copy mode", () => {
		const templateRule = new FrontmatterTemplateRule();
		const inlineRule = new InlinePropertiesToFrontmatter(false);

		const input =
			"# My Combined Note\nNote content with [category:: work] and [priority:: high].";

		// Step 1: FrontmatterTemplate adds initial template
		const step1 = templateRule.fix(input, "combined.md");
		// Step 2: InlinePropertiesToFrontmatter copies inline properties into the frontmatter
		const step2 = inlineRule.fix(step1, "combined.md");

		expect(step2).toContain("title:\n  - My Combined Note\n");
		expect(step2).toContain(`modified:\n  - ${today}\n`);
		expect(step2).toContain("category:\n  - work\n");
		expect(step2).toContain("priority:\n  - high\n");
		expect(step2).toContain("[category:: work]");
	});

	it("combines with InlinePropertiesToFrontmatter in move mode", () => {
		const templateRule = new FrontmatterTemplateRule();
		const inlineRule = new InlinePropertiesToFrontmatter(true);

		const input = "# Move Combined Note\nNote with [status:: done].";

		const step1 = templateRule.fix(input, "move.md");
		const step2 = inlineRule.fix(step1, "move.md");

		expect(step2).toContain("title:\n  - Move Combined Note\n");
		expect(step2).toContain(`modified:\n  - ${today}\n`);
		expect(step2).toContain("status:\n  - done\n");
		expect(step2).not.toContain("[status:: done]");
		expect(step2).toContain("# Move Combined Note\nNote with .");
	});
});
