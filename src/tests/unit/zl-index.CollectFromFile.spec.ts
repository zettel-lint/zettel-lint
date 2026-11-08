import { expect, test } from "vitest";
import { collectFromFile } from "../../zl-index-core.js";
import { ZlIndexOptions } from "../../core-options.js";
import { NodeFileAdapter } from "../../file-adapter.js";
import { toFilePath } from "../../file-system.js";

import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const adapter = new NodeFileAdapter(`${__dirname}/input`);
const options = {} as ZlIndexOptions;

test("no title uses filename", async () => {
  expect(await (await collectFromFile(toFilePath("no-title.md"), options, adapter)).title)
    .toBe("no-title");
});

test("wikiname uses filename", async () => {
  expect(await (await collectFromFile(toFilePath("yaml-title.md"), options, adapter)).wikiname)
    .toBe("yaml-title");
});

test("yaml title is a title", async () => {
  expect(await (await collectFromFile(toFilePath("yaml-title.md"), options, adapter)).title)
    .toBe("YAML title");
});

test("header title used if no yaml", async () => {
  expect(await (await collectFromFile(toFilePath("header-title.md"), options, adapter)).title)
    .toBe("Header Title");
});

test("first title used if multiple", async () => {
  expect(await (await collectFromFile(toFilePath("multi-title.md"), options, adapter)).title)
    .toBe("First title");
});

test("path starts from here", async () => {
  expect(await (await collectFromFile(toFilePath("no-title.md"), options, adapter)).fullpath)
      .toBe("no-title.md");
});

test("can parse wikilinks in file", async () => {
  expect(await (await collectFromFile(toFilePath("yaml-wikilink.md"), options, adapter)).title)
      .toBe("YAML title");
});