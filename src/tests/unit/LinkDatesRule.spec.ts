import { describe, expect, test } from "vitest";
import { LinkDatesRule } from "../../rules/LinkDatesRule.js";

describe("LinkDatesRule", () => {
	const rule = new LinkDatesRule();

	test("links standalone ISO dates to daily note wiki links", () => {
		const input = "Meeting held on 2026-02-20 with team.";
		expect(rule.fix(input, "test.md")).toBe(
			"Meeting held on [[2026-02-20]] with team.",
		);
	});

	test("does not double-link existing wiki links", () => {
		const input = "Meeting on [[2026-02-20]] already linked.";
		expect(rule.fix(input, "test.md")).toBe(
			"Meeting on [[2026-02-20]] already linked.",
		);
	});

	test("does not modify bracketed dates or link definitions", () => {
		const input = "Check [2026-02-20](https://example.com) or [2026-02-20].";
		expect(rule.fix(input, "test.md")).toBe(
			"Check [2026-02-20](https://example.com) or [2026-02-20].",
		);
	});

	test("is idempotent across multiple runs", () => {
		const input = "Events on 2026-02-20 and 2026-05-15.";
		const once = rule.fix(input, "test.md");
		expect(once).toBe("Events on [[2026-02-20]] and [[2026-05-15]].");
		expect(rule.fix(once, "test.md")).toBe(once);
	});
	test.each([
		"[[meeting on 2026-02-20 notes]]",
		"[meeting on 2026-02-20 notes]",
		"[outer [inner] 2026-02-20]",
		"`2026-02-20`",
		"``code ` 2026-02-20``",
		"```ts\nconst date = '2026-02-20';\n```",
		"~~~~\n2026-02-20\n~~~\n~~~~",
		"[report](archive/2026-02-20/report_(final))",
		"[report](<archive/2026-02-20/report>)",
		"https://example.com/2026-02-20?q=2026-02-20",
		"<https://example.com/2026-02-20>",
		"www.example.com/2026-02-20",
		"[report]: archive/2026-02-20",
		"---\ndate: 2026-02-20\n---",
		"\uFEFF---\r\ndate: 2026-02-20\r\n...",
	])("preserves protected content: %s", (protectedText: string) => {
		const input = `${protectedText}\nOutside 2026-05-15.`;
		const expected = `${protectedText}\nOutside [[2026-05-15]].`;
		expect(rule.fix(input, "test.md")).toBe(expected);
		expect(rule.fix(expected, "test.md")).toBe(expected);
	});

	test.each([
		"2026-02-30",
		"2025-02-29",
		"1900-02-29",
		"2026-04-31",
		"2026-00-10",
		"2026-13-10",
		"2026-01-00",
	])("leaves invalid calendar date %s unchanged", (date: string) => {
		expect(rule.fix(date, "test.md")).toBe(date);
	});

	test.each(["2024-02-29", "2000-02-29", "0096-02-29", "2026-12-31"])(
		"links valid date %s",
		(date: string) => {
			expect(rule.fix(date, "test.md")).toBe(`[[${date}]]`);
		},
	);

	test("preserves unclosed fences through the end of the note", () => {
		expect(rule.fix("2026-02-20\n```\n2026-05-15", "test.md")).toBe(
			"[[2026-02-20]]\n```\n2026-05-15",
		);
	});

	test("does not treat later thematic breaks or unmatched backticks as metadata or code", () => {
		const input = "Text ` 2026-02-20\n---\n2026-05-15\n---";
		expect(rule.fix(input, "test.md")).toBe(
			"Text ` [[2026-02-20]]\n---\n[[2026-05-15]]\n---",
		);
	});
});
