import { describe, expect, test } from "vitest";
import { idFromFilename } from "../../file-handling";

describe("idFromFilename", () => {
	test("extracts numeric ID from simple filename", () => {
		expect(idFromFilename("12345678-note-title.md")).toBe("12345678");
	});

	test("extracts numeric ID from Windows-style path", () => {
		expect(idFromFilename("C:\\notes\\12345678-note-title.md")).toBe(
			"12345678",
		);
	});

	test("extracts numeric ID from Unix-style path", () => {
		expect(idFromFilename("/home/user/notes/12345678-note-title.md")).toBe(
			"12345678",
		);
	});

	test("handles multiple dots in filename", () => {
		expect(idFromFilename("12345678-note.title.with.dots.md")).toBe("12345678");
	});

	test("returns empty string for invalid filename", () => {
		expect(idFromFilename("")).toBe("");
	});

	test("returns empty string for undefined filename", () => {
		expect(idFromFilename(undefined as any)).toBe("");
	});

	test("handles mixed path separators", () => {
		expect(idFromFilename("C:/notes\\12345678-note-title.md")).toBe("12345678");
	});

	test("handles filename without hyphen", () => {
		expect(idFromFilename("12345678.md")).toBe("12345678");
	});

	test("handles filename starting with hyphen", () => {
		expect(idFromFilename("-note.md")).toBe("");
	});

	test("handles hidden files starting with dot", () => {
		expect(idFromFilename(".hidden-123.md")).toBe("");
	});
});

describe("invertDictionary security", () => {
	test("safely handles built-in prototype method names and prototype keys", async () => {
		const { invertDictionary } = await import("../../types.js");
		const references = [
			{
				id: "note1",
				title: "Note 1",
				filename: "note1.md",
				fullpath: "/note1.md",
				name: "Tags",
				data: [
					"toString",
					"valueOf",
					"__proto__",
					"constructor",
					"prototype",
					"#validTag",
				],
				bag: [],
			},
		];

		const result = invertDictionary(references);

		expect(result.toString).toEqual(["[Note 1][note1]"]);
		expect(result.valueOf).toEqual(["[Note 1][note1]"]);
		expect(result["#validTag"]).toEqual(["[Note 1][note1]"]);

		expect(Object.hasOwn(result, "__proto__")).toBe(false);
		expect(Object.hasOwn(result, "constructor")).toBe(false);
		expect(Object.hasOwn(result, "prototype")).toBe(false);
	});
});
