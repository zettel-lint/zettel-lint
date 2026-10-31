import { expect, test, describe } from "vitest";
import { formatData, invertDictionary } from "../../types.js";

describe("invertDictionary security and prototype resilience", () => {
  test("handles prototype method names like toString and valueOf without throwing", () => {
    const refs: formatData[] = [
      {
        id: "note1",
        title: "Note 1",
        filename: "note1.md",
        fullpath: "note1.md",
        name: "test",
        data: ["toString", "valueOf", "hasOwnProperty", "toString"],
        bag: [],
      },
    ];

    expect(() => {
      const res = invertDictionary(refs);
      expect(res["toString"]).toEqual(["[Note 1][note1]", "[Note 1][note1]"]);
      expect(res["valueOf"]).toEqual(["[Note 1][note1]"]);
      expect(res["hasOwnProperty"]).toEqual(["[Note 1][note1]"]);
    }).not.toThrow();
  });

  test("filters out dangerous prototype keys (__proto__, constructor, prototype)", () => {
    const refs: formatData[] = [
      {
        id: "note2",
        title: "Note 2",
        filename: "note2.md",
        fullpath: "note2.md",
        name: "test",
        data: ["__proto__", "constructor", "prototype", "normalKey"],
        bag: [],
      },
    ];

    const res = invertDictionary(refs);
    expect(Object.prototype.hasOwnProperty.call(res, "__proto__")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(res, "constructor")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(res, "prototype")).toBe(false);
    expect(res["normalKey"]).toEqual(["[Note 2][note2]"]);
    expect(res.hasOwnProperty("normalKey")).toBe(true);
    expect(res.hasOwnProperty("missing")).toBe(false);
    expect(Object.getPrototypeOf(res)).toBe(Object.prototype);
    // Ensure Object.prototype was not polluted
    expect((Object.prototype as any).polluted).toBeUndefined();
  });

  test("handles empty or nullish references safely", () => {
    for (const refs of [[], undefined, null]) {
      const res = invertDictionary(refs as formatData[]);
      expect(res).toStrictEqual({});
      expect(Object.getPrototypeOf(res)).toBe(Object.prototype);
      expect(res.hasOwnProperty("tag")).toBe(false);
    }
  });
});
