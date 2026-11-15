import { describe, expect, test, vi } from "vitest";
import notesCommand from "../../cli/zl-notes.js";

describe("notesCommand (deprecation of zl notes)", () => {
  test("command has deprecated description", () => {
    const cmd = notesCommand();
    expect(cmd.description()).toContain("Deprecated, use 'zl fix'");
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

  test("action logs deprecation warning when invoked", async () => {
    const cmd = notesCommand();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    // Parse with a non-existent path or empty options to trigger action
    cmd.parse(["node", "zl-notes", "--path", "/dev/null"]);

    expect(warnSpy).toHaveBeenCalledWith(
      "Warning: 'zl notes' is deprecated and will be removed in a future release. Please use 'zl fix' instead."
    );

    warnSpy.mockRestore();
    logSpy.mockRestore();
  });
});
