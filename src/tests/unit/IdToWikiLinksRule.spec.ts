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
