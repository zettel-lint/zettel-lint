import importerCommand from "../../zl-import";

test('adds import to cli', () => {
    expect(importerCommand().name()).toBe("import");
  });

test('can parse source', () => {
  expect(importerCommand().parse(["node", "zl", "--source", "trello", "--path", "."]).source).toBe("trello");
});

test('can parse path', () => {
  expect(importerCommand().parse(["node", "zl", "--source", "trello", "--path", "."]).path).toBe(".");
});