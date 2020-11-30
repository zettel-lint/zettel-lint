import indexerCommand from "../../zl-index";

test('adds index to cli', () => {
    expect(indexerCommand().name()).toBe("index");
  });

test('can parse source', () => {
  expect(indexerCommand().parse(["node", "zl", "--ignore-dirs", "node_modules", "--path", "."]).ignoreDirs).toBe("node_modules");
});

test('can parse path', () => {
  expect(indexerCommand().parse(["node", "zl", "--ignore-dirs", "node_modules", "--path", "."]).path).toBe(".");
});