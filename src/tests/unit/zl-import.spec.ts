import { expect, test } from "vitest";
import importerCommand from "../../zl-import";
import { ErrorResponse } from "../../base-importer";

test('adds import to cli', () => {
    expect(importerCommand().name()).toBe("import");
  });

test('can parse source', () => {
  expect(importerCommand().parse(["node", "zl", "--source", "unknown", "--path", "."]).opts().source).toBe("unknown");
});

test('can parse path', () => {
  expect(importerCommand().parse(["node", "zl", "--source", "unknown", "--path", "."]).opts().path).toBe(".");
});

test('ErrorResponse interface type structure is satisfied', () => {
  const response: ErrorResponse = {
    success: false,
    message: "Error occurred"
  };
  expect(response.success).toBe(false);
  expect(response.message).toBe("Error occurred");
});
