import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

describe("zl-index system test", () => {
	const expectedOutputFile = join(__dirname, "expected", "references.md");
	const outputFile = join(__dirname, "outputs", "references.md");

	beforeAll(() => {
		// Run zl-index command over markdown files in the root directory, ignoring AGENTS.md
		const command = `npm run-script zl -- index -v -r ${outputFile} --show-orphans --ignore-dirs 'node_modules/**' 'src/**' 'lib/**' 'docs/**' 'AGENTS.md'`;
		execSync(command, { cwd: join(__dirname, "../../../../") });
	});

	it("should generate a references.md file matching the expected output, ignoring timestamps", () => {
		const normalize = (str: string) =>
			str
				.replace(/\r\n/g, "\n")
				.split("\n")
				.map((line) => line.trimEnd())
				.join("\n")
				.replace(/created: .*/g, "created: <ignored>")
				.replace(/modified: .*/g, "modified: <ignored>");

		const expectedContent = normalize(readFileSync(expectedOutputFile, "utf8"));
		const actualContent = normalize(readFileSync(outputFile, "utf8"));

		expect(actualContent).toBe(expectedContent);
	});
});
