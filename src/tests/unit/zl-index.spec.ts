import indexerCommand from "../../zl-index";

test('adds index to cli', () => {
    expect(indexerCommand().name()).toBe("index");
  });

test('can parse ignoreDirs', () => {
  const opts = indexerCommand().parse(["node", "zl", "--path", ".", "--ignore-dirs", "node_modules", "bin"]);
  expect(opts.args).toEqual([]);
  expect(opts.opts()["ignoreDirs"]).toBeDefined();
  expect(opts.opts().ignoreDirs).toEqual(["node_modules", "bin"]); 
});

test('can parse path', () => {
  expect(indexerCommand().parse(["node", "zl", "--ignore-dirs", "node_modules", "--path", "."]).opts().path).toBe(".");
});