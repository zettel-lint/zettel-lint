import { expect, test, describe } from "vitest";
import importerCommand from "../../cli/zl-import.js";
import TrelloImport, { TrelloOptions } from "../../trello-import.js";

describe('zl-import Trello options', () => {
  test('parses --trello-api-key', async () => {
    const cmd = importerCommand();
    await cmd.parseAsync([
      "node", "zl", "--source", "unknown", "--path", ".", "--trello-api-key", "abc123"
    ]);
    expect(cmd.opts().trelloApiKey).toBe("abc123");
  });

  test('parses --trello-board', async () => {
    const cmd = importerCommand();
    await cmd.parseAsync([
      "node", "zl", "--source", "unknown", "--path", ".", "--trello-board", "my-board"
    ]);
    expect(cmd.opts().trelloBoard).toBe("my-board");
  });

  test('parses --trello-token', async () => {
    const cmd = importerCommand();
    await cmd.parseAsync([
      "node", "zl", "--source", "unknown", "--path", ".", "--trello-token", "tok123"
    ]);
    expect(cmd.opts().trelloToken).toBe("tok123");
  });

  test('throws if board name is given but no token', async () => {
    const cmd = importerCommand();
    await cmd.parseAsync([
      "node", "zl", "--source", "unknown", "--path", ".", "--trello-api-key", "abc123", "--trello-board", "My Board"
    ]);
    expect(cmd.opts().trelloBoard).toBe("My Board");
    expect(cmd.opts().trelloToken).toBeUndefined();
  });

  test('parses all Trello options together', async () => {
    const cmd = importerCommand();
    await cmd.parseAsync([
      "node", "zl", "--source", "unknown", "--path", ".", "--trello-api-key", "abc123", "--trello-board", "bid123", "--trello-token", "tok123"
    ]);
    expect(cmd.opts().trelloApiKey).toBe("abc123");
    expect(cmd.opts().trelloBoard).toBe("bid123");
    expect(cmd.opts().trelloToken).toBe("tok123");
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
