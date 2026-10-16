import { describe, test, expect } from "vitest";
import { IdToWikiLinksRule } from "../../rules/IdToWikiLinksRule.js";

describe("IdToWikiLinksRule", () => {
  test("name property is id-to-wiki-links", () => {
    const rule = new IdToWikiLinksRule();
    expect(rule.name).toBe("id-to-wiki-links");
  });

  test("converts resolvable numeric [id] links to [[wiki-links]]", () => {
    const rule = new IdToWikiLinksRule();
    rule.prepare(["00000000-dummy-file.md", "20230901-note.md"], ".");

    const input = "Reference to [00000000] and [20230901].";
    const expected = "Reference to [[00000000-dummy-file]] and [[20230901-note]].";

    expect(rule.fix(input, "test.md")).toBe(expected);
  });

  test("handles subdirectories in wiki link targets", () => {
    const rule = new IdToWikiLinksRule();
    rule.prepare(["sub/folder/20230901-note.md"], ".");

    const input = "Reference to [20230901].";
    const expected = "Reference to [[sub/folder/20230901-note]].";

    expect(rule.fix(input, "test.md")).toBe(expected);
  });

  test("unresolved numeric links remain unchanged", () => {
    const rule = new IdToWikiLinksRule();
    rule.prepare(["00000000-dummy-file.md"], ".");

    const input = "Reference to [00000000] and unresolved [99999999].";
    const expected = "Reference to [[00000000-dummy-file]] and unresolved [99999999].";

    expect(rule.fix(input, "test.md")).toBe(expected);
  });

  test("existing wiki-links remain unchanged", () => {
    const rule = new IdToWikiLinksRule();
    rule.prepare(["00000000-dummy-file.md"], ".");

    const input = "Existing [[00000000-dummy-file]] and [[00000000]] remain untouched.";

    expect(rule.fix(input, "test.md")).toBe(input);
  });

  test.each(["\n", "\r\n"])("preserves YAML front matter with %j line endings", (newline: string) => {
    const rule = new IdToWikiLinksRule();
    rule.prepare(["20230901-note.md"], ".");
    const frontMatter = ["---", "references: [20230901]", 'title: "[20230901]"', "---", ""].join(newline);

    expect(rule.fix(frontMatter + "Prose [20230901].", "test.md"))
      .toBe(frontMatter + "Prose [[20230901-note]].");
  });

  test.each([
    "`[20230901]`",
    "``[20230901] with ` inside``",
    "`[20230901]\non another line`",
    "``[20230901] with ``` inside``",
  ])("preserves inline code %j and converts surrounding prose", (code: string) => {
    const rule = new IdToWikiLinksRule();
    rule.prepare(["20230901-note.md"], ".");

    expect(rule.fix(`[20230901] ${code} [20230901]`, "test.md"))
      .toBe(`[[20230901-note]] ${code} [[20230901-note]]`);
  });

  test.each([
    ["```ts", "~~~", "```", "\n"],
    ["~~~", "```", "~~~", "\n"],
    ["````", "```", "`````", "\n"],
    ["  ~~~~lang", "~~~", "   ~~~~~", "\r\n"],
  ])("preserves fenced code opened with %j", (opening: string, inner: string, closing: string, newline: string) => {
    const rule = new IdToWikiLinksRule();
    rule.prepare(["20230901-note.md"], ".");
    const code = [opening, "[20230901]", inner, "[20230901]", closing, ""].join(newline);

    expect(rule.fix(`[20230901]${newline}${code}[20230901]`, "test.md"))
      .toBe(`[[20230901-note]]${newline}${code}[[20230901-note]]`);
  });

  test("preserves an unclosed fenced code block through the end of the file", () => {
    const rule = new IdToWikiLinksRule();
    rule.prepare(["20230901-note.md"], ".");

    expect(rule.fix("[20230901]\n~~~\n[20230901]", "test.md"))
      .toBe("[[20230901-note]]\n~~~\n[20230901]");
  });

  test("converts prose after an unmatched backtick and between thematic breaks", () => {
    const rule = new IdToWikiLinksRule();
    rule.prepare(["20230901-note.md"], ".");

    expect(rule.fix("Prose ` [20230901]\n---\n[20230901]\n---", "test.md"))
      .toBe("Prose ` [[20230901-note]]\n---\n[[20230901-note]]\n---");
  });

  test("is idempotent: a second fix pass makes no further changes", () => {
    const rule = new IdToWikiLinksRule();
    rule.prepare(["00000000-dummy-file.md"], ".");

    const input = "Reference to [00000000] and [99999999] and [[00000000-dummy-file]].";
    const pass1 = rule.fix(input, "test.md");
    const pass2 = rule.fix(pass1, "test.md");

    expect(pass1).toBe("Reference to [[00000000-dummy-file]] and [99999999] and [[00000000-dummy-file]].");
    expect(pass2).toBe(pass1);
  });

  test("returns content unchanged if no numeric links are found", () => {
    const rule = new IdToWikiLinksRule();
    rule.prepare(["00000000-dummy-file.md"], ".");

    const input = "# Just a title\nNo numeric links here.";
    expect(rule.fix(input, "test.md")).toBe(input);
  });
});
