import { describe, it, beforeAll, expect } from "vitest";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

describe("zl-fix system test", () => {
  const expectedOutputFile = join(__dirname, "expected", "trailingNewline.md");
  const outputFile = join(__dirname, "outputs", "trailingNewline.md");

  beforeAll(() => {
    // Run zl-fix command over all `*.md` files in the inputs directory
    const testDir = __dirname;
    const packageDir = join(testDir, "../../../..");
    const inputDir = join(testDir, "inputs");
    const outputDir = join(testDir, "outputs");
    
    const command = `npm run-script zl -- fix -v --rules trailing-newline` +
      ` --path "${inputDir}"` +
      ` --output-dir "${outputDir}"`;
      
    execSync(command, { cwd: packageDir });
  });

  it("should generate a trailingNewline.md file matching the expected output, ignoring timestamps", () => {
    const expectedContent = readFileSync(expectedOutputFile, "utf8")
      .replace(/created: .*/g, "created: <ignored>")
      .replace(/modified: .*/g, "modified: <ignored>");
    const actualContent = readFileSync(outputFile, "utf8")
      .replace(/created: .*/g, "created: <ignored>")
      .replace(/modified: .*/g, "modified: <ignored>");

    expect(actualContent).toBe(expectedContent);
  });
});
