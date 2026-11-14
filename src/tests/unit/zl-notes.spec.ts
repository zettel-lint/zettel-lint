import { describe, expect, test, vi } from "vitest";
import notesCommand from "../../cli/zl-notes.js";

describe("notesCommand (deprecation of zl notes)", () => {
  test("help description includes deprecation guidance for numeric links", () => {
    const cmd = notesCommand();
    const guidance = "Deprecated: users relying on numeric-link conversion should continue using 'zl notes' until 'zl fix' supports it; all other users should use 'zl fix'.";
    expect(cmd.description()).toContain(guidance);
    expect(cmd.helpInformation().replace(/\s+/g, " ")).toContain(guidance);
    expect(cmd.alias()).toBe("update");
  });

  test("command defines expected options", () => {
    const cmd = notesCommand();
    const optionNames = cmd.options.map(opt => opt.name());
    expect(optionNames).toContain("path");
    expect(optionNames).toContain("ignore-dirs");
    expect(optionNames).toContain("wiki-links-from-id");
    expect(optionNames).toContain("show-orphans");
    expect(optionNames).toContain("json-debug-output");
    expect(optionNames).toContain("no-wiki");
    expect(optionNames).toContain("verbose");
  });

  test("action logs clarified deprecation warning when invoked", async () => {
    const cmd = notesCommand();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Parse with a non-existent path to trigger action without modifying repo notes
    cmd.parse(["node", "zl-notes", "--path", "/dev/null"]);

    expect(warnSpy).toHaveBeenCalledWith(
      "Warning: 'zl notes' is deprecated and will be removed in a future release. Users relying on numeric-link conversion should continue using 'zl notes' until 'zl fix' supports it; all other users should use 'zl fix'."
    );

    warnSpy.mockRestore();
    logSpy.mockRestore();
  });
});
