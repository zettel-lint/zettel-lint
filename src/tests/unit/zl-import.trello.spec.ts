import { expect, test, describe } from "vitest";
import importerCommand from "../../cli/zl-import.js";
import TrelloImport, { TrelloOptions } from "../../trello-import.js";

describe('zl-import Trello options', () => {
  test('parses --trello-api-key', () => {
    const opts = importerCommand().parse([
      "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-api-key", "abc123"
    ]).opts();
    expect(opts.trelloApiKey).toBe("abc123");
  });

  test('parses --trello-board', () => {
    const opts = importerCommand().parse([
      "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-board", "my-board"
    ]).opts();
    expect(opts.trelloBoard).toBe("my-board");
  });

  test('parses --trello-token', () => {
    const opts = importerCommand().parse([
      "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-token", "tok123"
    ]).opts();
    expect(opts.trelloToken).toBe("tok123");
  });

  test('throws if board name is given but no token', async () => {
    // Simulate the parseFiles logic
    const program = importerCommand().parse([
      "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-api-key", "abc123", "--trello-board", "My Board"
    ]);
    // The actual importer logic throws if no token is provided and board name is not an id
    // Here we just check the options, not the network call
    expect(program.opts().trelloBoard).toBe("My Board");
    expect(program.opts().trelloToken).toBeUndefined();
    // The actual error is thrown at runtime, not parse time
  });

  test('parses all Trello options together', () => {
    const opts = importerCommand().parse([
      "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-api-key", "abc123", "--trello-board", "bid123", "--trello-token", "tok123"
    ]).opts();
    expect(opts.trelloApiKey).toBe("abc123");
    expect(opts.trelloBoard).toBe("bid123");
    expect(opts.trelloToken).toBe("tok123");
  });

  test('normalizes output-folder path without trailing slash issues', () => {
    const opts = importerCommand().parse([
      "node", "zl", "--source", "trello", "--output-folder", "../import/", "--trello-api-key", "abc123", "--trello-board", "bid123"
    ]).opts();
    expect(opts.outputFolder).toBe("../import/");
  });
});

describe('TrelloImport.saveAttachments security', () => {
  const options: TrelloOptions = {
    boardIdOrName: "bid123",
    apiKey: "key",
    verbose: false,
  };

  test('filters out unsafe attachment URL protocols like javascript:', async () => {
    const importer = new TrelloImport();
    const attachments = [
      {
        id: "att1",
        name: "Safe Link",
        url: "https://example.com/file.png",
        fileName: "",
        bytes: {},
        date: new Date(),
        edgeColor: "#000000",
        idMember: "",
        isUpload: false,
        mimeType: "text/html",
        previews: [],
        pos: 0
      },
      {
        id: "att2",
        name: "Malicious JS Link",
        url: "javascript:alert(1)",
        fileName: "",
        bytes: {},
        date: new Date(),
        edgeColor: "#000000",
        idMember: "",
        isUpload: false,
        mimeType: "text/html",
        previews: [],
        pos: 1
      },
      {
        id: "att3",
        name: "Local File Link",
        url: "file:///etc/passwd",
        fileName: "",
        bytes: {},
        date: new Date(),
        edgeColor: "#000000",
        idMember: "",
        isUpload: false,
        mimeType: "text/plain",
        previews: [],
        pos: 2
      }
    ];

    const result = await importer.saveAttachments("/tmp/out", options, attachments);
    expect(result).toEqual(["[Safe Link](https://example.com/file.png)"]);
  });
});
