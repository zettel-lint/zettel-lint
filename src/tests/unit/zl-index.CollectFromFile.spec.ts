import { expect, test } from "vitest";
import { collectFromFile } from "../../zl-index"

import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputFilePath = `${__dirname}/input/`;

test("no title uses filename", async () => {
  expect(await (await collectFromFile(`${inputFilePath}no-title.md`, {})).title)
    .toBe("no-title");
});

test("wikiname uses filename", async () => {
  expect(await (await collectFromFile(`${inputFilePath}yaml-title.md`, {})).wikiname)
    .toBe("yaml-title");
});

test("yaml title is a title", async () => {
  expect(await (await collectFromFile(`${inputFilePath}yaml-title.md`, {})).title)
    .toBe("YAML title");
});

test("header title used if no yaml", async () => {
  expect(await (await collectFromFile(`${inputFilePath}header-title.md`, {})).title)
    .toBe("Header Title");
});

test("first title used if multiple", async () => {
  expect(await (await collectFromFile(`${inputFilePath}multi-title.md`, {})).title)
    .toBe("First title");
});

test("path starts from here", async () => {
  expect(await (await collectFromFile(`${inputFilePath}no-title.md`, {})).fullpath)
      .toBe(`${inputFilePath}no-title.md`);
});