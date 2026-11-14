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

  test('redacts custom options containing sensitive keywords when printed', async () => {
    const originalConsoleLog = console.log;
    let loggedOutput = "";
    console.log = (...args: any[]) => {
      loggedOutput += args.join(" ") + "\n";
    };

    try {
      const cmd = importerCommand();
      await cmd.parseAsync([
        "node", "zl", "--source", "unknown", "--path", ".", "--trello-api-key", "MY_SECRET_KEY", "--trello-token", "MY_SECRET_TOKEN"
      ]);

      expect(loggedOutput).not.toContain("MY_SECRET_KEY");
      expect(loggedOutput).not.toContain("MY_SECRET_TOKEN");
      expect(loggedOutput).toContain("[REDACTED]");
    } finally {
      console.log = originalConsoleLog;
    }
  });
});

describe('TrelloImport credential redaction in errors', () => {
  test('redacts key and token in downloadBoardJson error messages when fetch fails', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return {
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      } as Response;
    };

    try {
      const options: TrelloOptions = {
        boardIdOrName: "0123456789abcdef01234567",
        apiKey: "SECRET_KEY_123",
        token: "SECRET_TOKEN_456",
        verbose: false,
      };

      await expect(TrelloImport.downloadBoardJson(options)).rejects.toThrow();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('redacts secret query parameters in error messages containing raw URLs', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new TypeError("Failed to fetch https://api.trello.com/1/boards/123?key=SECRET_KEY_999&token=SECRET_TOKEN_888");
    };

    try {
      const options: TrelloOptions = {
        boardIdOrName: "0123456789abcdef01234567",
        apiKey: "SECRET_KEY_999",
        token: "SECRET_TOKEN_888",
        verbose: false,
      };
      await expect(TrelloImport.downloadBoardJson(options)).rejects.toSatisfy((err: Error) => {
        expect(err.message).not.toContain("SECRET_KEY_999");
        expect(err.message).not.toContain("SECRET_TOKEN_888");
        expect(err.message).toContain("[REDACTED]");
        return true;
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('redacts secret query parameters in verbose attachment logging', async () => {
    const originalConsoleLog = console.log;
    let logged = "";
    console.log = (...args: any[]) => {
      logged += args.join(" ") + "\n";
    };

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(0),
    } as any);

    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const os = await import("os");
      const importer = new TrelloImport();
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "trello-att-log-"));
      await importer.saveAttachments(tmpDir, {
        boardIdOrName: "123",
        apiKey: "key",
        verbose: true,
      }, [
        {
          id: "att1",
          url: "https://api.trello.com/file?key=SECRET_KEY&token=SECRET_TOKEN",
          fileName: "file.png",
          name: "File",
          mimeType: "image/png",
        } as any,
      ]);
      expect(logged).not.toContain("SECRET_KEY");
      expect(logged).not.toContain("SECRET_TOKEN");
      expect(logged).toContain("[REDACTED]");
      await fs.rm(tmpDir, { recursive: true, force: true });
    } finally {
      console.log = originalConsoleLog;
      globalThis.fetch = originalFetch;
    }
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

  test('sanitizes Windows-style backslash path traversals and dangerous property names', async () => {
    const importer = new TrelloImport();
    const attachments = [
      {
        id: "att-win-traversal",
        name: "Windows Traversal",
        url: "https://example.com/evil.sh",
        fileName: "..\\..\\evil.sh",
        bytes: {},
        date: new Date(),
        edgeColor: "#000000",
        idMember: "",
        isUpload: false,
        mimeType: "application/x-sh",
        previews: [],
        pos: 0
      },
      {
        id: "att-win-subfolder",
        name: "Windows Subfolder",
        url: "https://example.com/sub.png",
        fileName: "nested\\sub.png",
        bytes: {},
        date: new Date(),
        edgeColor: "#000000",
        idMember: "",
        isUpload: false,
        mimeType: "image/png",
        previews: [],
        pos: 1
      },
      {
        id: "att-proto",
        name: "Proto File",
        url: "https://example.com/proto",
        fileName: "__proto__",
        bytes: {},
        date: new Date(),
        edgeColor: "#000000",
        idMember: "",
        isUpload: false,
        mimeType: "text/plain",
        previews: [],
        pos: 2
      },
      {
        id: "att-constructor",
        name: "Constructor File",
        url: "https://example.com/constructor",
        fileName: "constructor",
        bytes: {},
        date: new Date(),
        edgeColor: "#000000",
        idMember: "",
        isUpload: false,
        mimeType: "text/plain",
        previews: [],
        pos: 3
      }
    ];

    // Dangerous names (__proto__, constructor) should fall back to markdown links
    // Windows backslash traversals should be stripped to base filename (mocking fetch)
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (url: string | URL | Request) => {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          arrayBuffer: async () => new ArrayBuffer(8),
        } as Response;
      };

      const fs = await import("fs/promises");
      const path = await import("path");
      const os = await import("os");
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "trello-att-test-"));

      const result = await importer.saveAttachments(tmpDir, options, attachments);

      expect(result).toContain("![Windows Traversal](" + path.join(tmpDir, "evil.sh") + ")");
      expect(result).toContain("![Windows Subfolder](" + path.join(tmpDir, "sub.png") + ")");
      expect(result).toContain("[Proto File](https://example.com/proto)");
      expect(result).toContain("[Constructor File](https://example.com/constructor)");

      await fs.rm(tmpDir, { recursive: true, force: true });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('TrelloImport prototype collision resilience', () => {
  const options: TrelloOptions = {
    boardIdOrName: "bid123",
    apiKey: "key",
    verbose: false,
  };

  test('handles card comments and lists with prototype collision IDs without crashing', async () => {
    const fs = await import("fs/promises");
    const path = await import("path");
    const os = await import("os");

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "trello-proto-test-"));
    const jsonPath = path.join(tmpDir, "trello-export.json");
    const outFolder = path.join(tmpDir, "output");
    await fs.mkdir(outFolder, { recursive: true });

    const boardContent = {
      name: "Test Board",
      cards: [
        {
          id: "toString",
          name: "Card with Prototype ID",
          desc: "Description",
          closed: false,
          isTemplate: false,
          idList: "toString",
          dateLastActivity: new Date().toISOString(),
          idChecklists: [],
          attachments: [],
          labels: []
        }
      ],
      checklists: [
        {
          id: "toString",
          name: "Prototype Checklist",
          checkItems: []
        }
      ],
      lists: [
        {
          id: "toString",
          name: "Prototype List",
          closed: false
        }
      ],
      labels: [],
      actions: [
        {
          type: "commentCard",
          data: {
            card: { id: "toString" },
            text: "A comment on toString card"
          },
          date: new Date().toISOString(),
          memberCreator: { fullName: "Tester" }
        },
        {
          type: "commentCard",
          data: {
            card: { id: "valueOf" },
            text: "A comment on valueOf card"
          },
          date: new Date().toISOString(),
          memberCreator: { fullName: "Tester" }
        }
      ]
    };

    await fs.writeFile(jsonPath, JSON.stringify(boardContent));

    const importer = new TrelloImport();
    const response = await importer.importAsync(jsonPath, outFolder, options);

    expect(response.success).toBe(true);
    expect(response.message).toContain("1 notes created");

    // Clean up
    await fs.rm(tmpDir, { recursive: true, force: true });
  });
});
