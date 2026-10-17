import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";

describe("zl-fix system test", () => {
	beforeAll(() => {
		// Run zl-fix command over all `*.md` files in the inputs directory
		const testDir = __dirname;
		const packageDir = join(testDir, "../../../..");
		const inputDir = join(testDir, "inputs");
		const outputDir = join(testDir, "outputs");

		const command =
			`npm run-script zl -- fix -v --move --rules trailing-newline inline-properties-to-frontmatter id-to-wiki-links --property-filter "^inline$"` +
			` --path "${inputDir}"` +
			` --output-dir "${outputDir}"`;

		execSync(command, { cwd: packageDir });
	});

	test.each([
		["trailingNewline.md"],
		["formatFrontmatter.md"],
		["formatFrontmatterWithRegex.md"],
		["idToWikiLinks.md"],
	])(
		"should generate a %s file matching the expected output, ignoring timestamps",
		(filename: string) => {
			const expectedOutputFile = join(__dirname, "expected", filename);
			const outputFile = join(__dirname, "outputs", filename);

			const expectedContent = readFileSync(expectedOutputFile, "utf8")
				.replace(/created: .*/g, "created: <ignored>")
				.replace(/modified: .*/g, "modified: <ignored>");
			const actualContent = readFileSync(outputFile, "utf8")
				.replace(/created: .*/g, "created: <ignored>")
				.replace(/modified: .*/g, "modified: <ignored>");

			expect(actualContent).toBe(expectedContent);
		},
	);
});
