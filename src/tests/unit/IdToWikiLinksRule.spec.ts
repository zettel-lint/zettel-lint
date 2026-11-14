import { describe, expect, test } from "vitest";
import { toFilePath } from "../../file-system.js";
import { IdToWikiLinksRule } from "../../rules/IdToWikiLinksRule.js";

describe("IdToWikiLinksRule", () => {
  const rule = new IdToWikiLinksRule(
    [
      toFilePath("notes/12345678-target-note.md"),
      toFilePath("notes/nested/23456789012345-another-note.md"),
    ],
    toFilePath("notes"),
  );

  test("converts resolvable numeric links to paths relative to the selected root", () => {
    expect(rule.fix("See [12345678] and [23456789012345].", "notes/source.md"))
      .toBe("See [[12345678-target-note]] and [[nested/23456789012345-another-note]].");
  });

  test("leaves unresolved links and existing wiki-links unchanged", () => {
    expect(rule.fix("See [87654321] and [[12345678]].", "notes/source.md"))
      .toBe("See [87654321] and [[12345678]].");
  });

  test("converts every occurrence and is idempotent", () => {
    const converted = rule.fix("[12345678] then [12345678].", "notes/source.md");
    expect(converted).toBe("[[12345678-target-note]] then [[12345678-target-note]].");
    expect(rule.fix(converted, "notes/source.md")).toBe(converted);
  });

  test("preserves bracketed IDs inside wiki-link filenames across repeated fixes", () => {
    const rule = new IdToWikiLinksRule(
      [
        toFilePath("notes/12345678-target-[87654321]-note.md"),
        toFilePath("notes/87654321-other-note.md"),
      ],
      toFilePath("notes"),
    );
    const input = "See [12345678], [[12345678-target-[87654321]-note]], and [87654321].";
    const expected = "See [[12345678-target-[87654321]-note]], [[12345678-target-[87654321]-note]], and [[87654321-other-note]].";

    const converted = rule.fix(input, "notes/source.md");
    expect(converted).toBe(expected);
    expect(rule.fix(converted, "notes/source.md")).toBe(expected);
  });

  test("only matches IDs with the legacy 8-to-14 digit length", () => {
    expect(rule.fix("[1234567] [12345678] [123456789012345]", "notes/source.md"))
      .toBe("[1234567] [[12345678-target-note]] [123456789012345]");
  });
});
