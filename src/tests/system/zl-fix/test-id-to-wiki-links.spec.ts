import { beforeAll, describe, expect, test } from "vitest";
import { execFileSync, execSync } from "child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

describe("zl-fix id-to-wiki-links system test", () => {
  beforeAll(() => {
    const testDir = __dirname;
    const packageDir = join(testDir, "../../../..");
    const inputDir = join(testDir, "id-to-wiki-links/inputs");
    const outputDir = join(testDir, "outputs/id-to-wiki-links");
    const command = `npm run-script zl -- fix --rules id-to-wiki-links` +
      ` --path "${inputDir}"` +
      ` --output-dir "${outputDir}"`;

    execSync(command, { cwd: packageDir });
  });

  test("converts resolvable IDs through the zl fix CLI", () => {
    const expected = readFileSync(join(__dirname, "id-to-wiki-links/expected/source.md"), "utf8");
    const actual = readFileSync(join(__dirname, "outputs/id-to-wiki-links/source.md"), "utf8");
    expect(actual).toBe(expected);
  });

  test("matches the legacy zl notes conversion for resolvable and unresolved links", () => {
    const packageDir = join(__dirname, "../../../..");
    const inputDir = join(__dirname, "id-to-wiki-links/inputs");
    const tempDir = mkdtempSync(join(tmpdir(), "zl-id-to-wiki-links-"));
    const legacyInputDir = join(tempDir, "inputs");

    try {
      cpSync(inputDir, legacyInputDir, { recursive: true });
      execFileSync("npm", [
        "run-script", "zl", "--", "notes", "--wiki-links-from-id", "--path", legacyInputDir,
      ], { cwd: packageDir, stdio: "pipe" });

      const legacyOutput = readFileSync(join(legacyInputDir, "source.md"), "utf8");
      const fixOutput = readFileSync(join(__dirname, "outputs/id-to-wiki-links/source.md"), "utf8");
      expect(fixOutput).toBe(legacyOutput);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
