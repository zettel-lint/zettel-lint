import { describe, test, beforeAll, expect } from "vitest";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

describe("zl-fix system test", () => {
  beforeAll(() => {
    // Run zl-fix command over all `*.md` files in the inputs directory
    const testDir = __dirname;
    const packageDir = join(testDir, "../../../..");
    const inputDir = join(testDir, "inputs");
    const outputDir = join(testDir, "outputs");
    
    const command = `npm run-script zl -- fix -v --move --rules trailing-newline inline-properties-to-frontmatter` +
      ` --path "${inputDir}"` +
      ` --output-dir "${outputDir}"`;
      
    execSync(command, { cwd: packageDir });
  });

  test.each([
    ["trailingNewline.md"],
    ["formatFrontmatter.md"]
  ])("should generate a %s file matching the expected output, ignoring timestamps", (filename) => {
  const expectedOutputFile = join(__dirname, "expected", filename);
  const outputFile = join(__dirname, "outputs", filename);

    const expectedContent = readFileSync(expectedOutputFile, "utf8")
      .replace(/created: .*/g, "created: <ignored>")
      .replace(/modified: .*/g, "modified: <ignored>");
    const actualContent = readFileSync(outputFile, "utf8")
      .replace(/created: .*/g, "created: <ignored>")
      .replace(/modified: .*/g, "modified: <ignored>");

    expect(actualContent).toBe(expectedContent);
  });
});
