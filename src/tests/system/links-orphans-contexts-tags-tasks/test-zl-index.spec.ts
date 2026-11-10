import { describe, it, beforeAll, expect } from "vitest";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

describe("zl-index system test", () => {
  const expectedOutputFile = join(__dirname, "expected", "references.md");
  const outputFile = join(__dirname, "outputs", "references.md");
  let commandOutput: string;

  beforeAll(() => {
    // Run zl-index command over markdown files in the root directory, ignoring AGENTS.md
    const command = `npm run-script zl -- index -v -r ${outputFile} --show-orphans --ignore-dirs "node_modules/**" "src/**" "lib/**" "docs/**" "AGENTS.md"`;
    commandOutput = execSync(command, { cwd: join(__dirname, "../../../../"), encoding: "utf8" });
  });

  it("should generate a references.md file matching the expected output, ignoring timestamps", () => {
    const expectedContent = readFileSync(expectedOutputFile, "utf8")
      .replace(/created: .*/g, "created: <ignored>")
      .replace(/modified: .*/g, "modified: <ignored>")
      .replace(/\r\n/g, "\n");
    const actualContent = readFileSync(outputFile, "utf8")
      .replace(/created: .*/g, "created: <ignored>")
      .replace(/modified: .*/g, "modified: <ignored>")
      .replace(/\r\n/g, "\n");

    expect(actualContent).toBe(expectedContent);
  });

  it("prints orphan links when --show-orphans is enabled", () => {
    expect(commandOutput).toContain("Orphan links:");
    expect(commandOutput).toContain("[xxxxxxxxxxxxx]");
  });
});
