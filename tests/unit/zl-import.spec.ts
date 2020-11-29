import importerCommand from "../../src/zl-import";

test('adds import to cli', () => {
    expect(importerCommand().name()).toBe("import");
  });