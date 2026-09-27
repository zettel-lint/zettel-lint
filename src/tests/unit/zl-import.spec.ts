import { expect, test } from "vitest";
import importerCommand from "../../zl-import";

test('adds import to cli', () => {
    expect(importerCommand().name()).toBe("import");
  });

test('can parse source', () => {
  expect(importerCommand().parse(["node", "zl", "--source", "unknown", "--path", "."]).opts().source).toBe("unknown");
});

test('can parse path', () => {
  expect(importerCommand().parse(["node", "zl", "--source", "unknown", "--path", "."]).opts().path).toBe(".");
});