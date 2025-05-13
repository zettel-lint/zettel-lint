import { describe, it, beforeAll, expect } from "vitest";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

describe("zl-index system test", () => {
  const expectedOutputFile = join(__dirname, "expected", "references.md");
  const outputFile = join(__dirname, "outputs", "references.md");

  beforeAll(() => {
    // Run zl-index command over all `*.md` files in the root directory
    const command = `npm run-script zl -- index -v -r ${outputFile} --show-orphans --ignore-dirs \"node_modules/**\" \"src/**\" \"lib/**\"`;
    execSync(command, { cwd: join(__dirname, "../../../../") });
  });

  it("should generate a references.md file matching the expected output, ignoring timestamps", () => {
    const expectedContent = readFileSync(expectedOutputFile, "utf8")
      .replace(/created: .*/g, "created: <ignored>")
      .replace(/modified: .*/g, "modified: <ignored>");
    const actualContent = readFileSync(outputFile, "utf8")
      .replace(/created: .*/g, "created: <ignored>")
      .replace(/modified: .*/g, "modified: <ignored>");

    expect(actualContent).toBe(expectedContent);
  });
});
