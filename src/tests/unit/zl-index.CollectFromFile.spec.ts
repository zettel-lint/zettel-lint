import { expect, test } from "vitest";
import { collectFromFile, ZlIndexOptions } from "../../zl-index"

import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputFilePath = `${__dirname}/input/`;

test("no title uses filename", async () => {
  expect(await (await collectFromFile(`${inputFilePath}no-title.md`, {} as ZlIndexOptions)).title)
    .toBe("no-title");
});

test("wikiname uses filename", async () => {
  expect(await (await collectFromFile(`${inputFilePath}yaml-title.md`, {} as ZlIndexOptions)).wikiname)
    .toBe("yaml-title");
});

test("yaml title is a title", async () => {
  expect(await (await collectFromFile(`${inputFilePath}yaml-title.md`, {} as ZlIndexOptions)).title)
    .toBe("YAML title");
});

test("header title used if no yaml", async () => {
  expect(await (await collectFromFile(`${inputFilePath}header-title.md`, {} as ZlIndexOptions)).title)
    .toBe("Header Title");
});

test("first title used if multiple", async () => {
  expect(await (await collectFromFile(`${inputFilePath}multi-title.md`, {} as ZlIndexOptions)).title)
    .toBe("First title");
});

test("path starts from here", async () => {
  expect(await (await collectFromFile(`${inputFilePath}no-title.md`, {} as ZlIndexOptions)).fullpath)
      .toBe(`${inputFilePath}no-title.md`);
});

test("can parse wikilinks in file", async () => {
  expect(await (await collectFromFile(`${inputFilePath}yaml-wikilink.md`, {} as ZlIndexOptions)).title)
      .toBe("YAML title");
});