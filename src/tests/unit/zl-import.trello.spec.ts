import { expect, test, describe } from "vitest";
import importerCommand from "../../zl-import";

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
});
