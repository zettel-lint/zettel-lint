import { describe, expect, test } from "vitest";
import { LinkDatesRule } from "../../rules/LinkDatesRule.js";

describe("LinkDatesRule", () => {
  const rule = new LinkDatesRule();

  test("links standalone ISO dates to daily note wiki links", () => {
    const input = "Meeting held on 2026-02-20 with team.";
    expect(rule.fix(input, "test.md")).toBe("Meeting held on [[2026-02-20]] with team.");
  });

  test("does not double-link existing wiki links", () => {
    const input = "Meeting on [[2026-02-20]] already linked.";
    expect(rule.fix(input, "test.md")).toBe("Meeting on [[2026-02-20]] already linked.");
  });

  test("does not modify bracketed dates or link definitions", () => {
    const input = "Check [2026-02-20](https://example.com) or [2026-02-20].";
    expect(rule.fix(input, "test.md")).toBe("Check [2026-02-20](https://example.com) or [2026-02-20].");
  });

  test("is idempotent across multiple runs", () => {
    const input = "Events on 2026-02-20 and 2026-05-15.";
    const once = rule.fix(input, "test.md");
    expect(once).toBe("Events on [[2026-02-20]] and [[2026-05-15]].");
    expect(rule.fix(once, "test.md")).toBe(once);
  });
});
