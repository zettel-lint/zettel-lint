import { describe, expect, it } from "vitest";
import { formatData, invertDictionary } from "../../types.js";

describe("invertDictionary security and prototype pollution resilience", () => {
	it("handles inherited Object.prototype property names without throwing", () => {
		const ref = new formatData();
		ref.title = "Test Note";
		ref.id = "20230101";
		ref.data = ["toString", "valueOf", "hasOwnProperty", "isPrototypeOf"];

		expect(() => {
			const result = invertDictionary([ref]);
			expect(result.toString).toEqual(["[Test Note][20230101]"]);
			expect(result.valueOf).toEqual(["[Test Note][20230101]"]);
			expect(result.hasOwnProperty).toEqual(["[Test Note][20230101]"]);
			expect(result.isPrototypeOf).toEqual(["[Test Note][20230101]"]);
		}).not.toThrow();
	});

	it("filters out dangerous prototype pollution keys (__proto__, constructor, prototype)", () => {
		const ref = new formatData();
		ref.title = "Malicious Note";
		ref.id = "666";
		ref.data = ["__proto__", "constructor", "prototype"];

		const protoObj = Object.prototype as Record<string, unknown>;
		const beforeProto = protoObj.polluted;
		const result = invertDictionary([ref]);

		expect(Object.getOwnPropertyNames(result)).toEqual([]);
		expect(result.constructor).toBeUndefined();
		expect(result.prototype).toBeUndefined();
		expect(protoObj.polluted).toBe(beforeProto);
	});

	it("inverts standard reference keys correctly", () => {
		const ref1 = new formatData();
		ref1.title = "Note 1";
		ref1.id = "1";
		ref1.data = ["tagA", "tagB"];

		const ref2 = new formatData();
		ref2.title = "Note 2";
		ref2.id = "2";
		ref2.data = ["tagA", "tagC"];

		const result = invertDictionary([ref1, ref2]);
		expect(result.tagA).toEqual(["[Note 1][1]", "[Note 2][2]"]);
		expect(result.tagB).toEqual(["[Note 1][1]"]);
		expect(result.tagC).toEqual(["[Note 2][2]"]);
	});
});
