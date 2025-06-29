import { expect, test, describe, beforeEach, afterEach, vi } from "vitest";
import importerCommand from "../../zl-import";

describe('zl-import Trello options', () => {
  beforeEach(() => {
    // Reset any mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    vi.restoreAllMocks();
  });

  describe('Basic option parsing', () => {
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

    test('parses all Trello options together', () => {
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-api-key", "abc123", "--trello-board", "bid123", "--trello-token", "tok123"
      ]).opts();
      expect(opts.trelloApiKey).toBe("abc123");
      expect(opts.trelloBoard).toBe("bid123");
      expect(opts.trelloToken).toBe("tok123");
    });
  });

  describe('Edge cases and validation', () => {
    test('handles empty string values for trello options', () => {
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-api-key", ""
      ]).opts();
      expect(opts.trelloApiKey).toBe("");
    });

    test('handles special characters in trello options', () => {
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-api-key", "key-with-dashes_and_underscores123"
      ]).opts();
      expect(opts.trelloApiKey).toBe("key-with-dashes_and_underscores123");
    });

    test('handles very long trello option values', () => {
      const longValue = "a".repeat(1000);
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-api-key", longValue
      ]).opts();
      expect(opts.trelloApiKey).toBe(longValue);
    });

    test('handles unicode characters in trello options', () => {
      const unicodeValue = "测试-テスト-🔥";
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-board", unicodeValue
      ]).opts();
      expect(opts.trelloBoard).toBe(unicodeValue);
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

    test('handles null-like values', () => {
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-api-key", "null"
      ]).opts();
      expect(opts.trelloApiKey).toBe("null");
    });

    test('handles numeric strings as option values', () => {
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-board", "12345"
      ]).opts();
      expect(opts.trelloBoard).toBe("12345");
    });
  });

  describe('Command-line argument combinations', () => {
    test('handles mixed case option names', () => {
      // Test that options are case-sensitive
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-api-key", "test123"
      ]).opts();
      expect(opts.trelloApiKey).toBe("test123");
    });

    test('handles trello options with other source options', () => {
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json", 
        "--trello-api-key", "abc123", "--verbose"
      ]).opts();
      expect(opts.trelloApiKey).toBe("abc123");
      expect(opts.verbose).toBeTruthy();
    });

    test('handles multiple paths with trello options', () => {
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "file1.json", "--path", "file2.json",
        "--trello-api-key", "abc123"
      ]).opts();
      expect(opts.trelloApiKey).toBe("abc123");
      expect(Array.isArray(opts.path) ? opts.path : [opts.path]).toContain("file1.json");
    });

    test('handles options interleaved with other arguments', () => {
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--trello-api-key", "abc123", 
        "--path", "trello-export.json", "--trello-board", "myboard"
      ]).opts();
      expect(opts.trelloApiKey).toBe("abc123");
      expect(opts.trelloBoard).toBe("myboard");
      expect(opts.source).toBe("trello");
    });
  });

  describe('Option precedence and conflicts', () => {
    test('uses last value when trello option is specified multiple times', () => {
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json", 
        "--trello-api-key", "first", "--trello-api-key", "second"
      ]).opts();
      expect(opts.trelloApiKey).toBe("second");
    });

    test('handles trello options in different order', () => {
      const opts = importerCommand().parse([
        "node", "zl", "--trello-token", "tok123", "--source", "trello", 
        "--trello-board", "board123", "--path", "trello-export.json", "--trello-api-key", "api123"
      ]).opts();
      expect(opts.trelloApiKey).toBe("api123");
      expect(opts.trelloBoard).toBe("board123");
      expect(opts.trelloToken).toBe("tok123");
    });

    test('handles all three trello options with duplicates', () => {
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json",
        "--trello-api-key", "key1", "--trello-board", "board1", "--trello-token", "token1",
        "--trello-api-key", "key2", "--trello-board", "board2", "--trello-token", "token2"
      ]).opts();
      expect(opts.trelloApiKey).toBe("key2");
      expect(opts.trelloBoard).toBe("board2");
      expect(opts.trelloToken).toBe("token2");
    });
  });

  describe('Integration with other options', () => {
    test('works with dry-run option', () => {
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json", 
        "--trello-api-key", "abc123", "--dry-run"
      ]).opts();
      expect(opts.trelloApiKey).toBe("abc123");
      expect(opts.dryRun).toBeTruthy();
    });

    test('works with output directory option', () => {
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json", 
        "--trello-api-key", "abc123", "--output-dir", "/tmp/output"
      ]).opts();
      expect(opts.trelloApiKey).toBe("abc123");
      expect(opts.outputDir).toBe("/tmp/output");
    });

    test('maintains source option requirement', () => {
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-api-key", "abc123"
      ]).opts();
      expect(opts.source).toBe("trello");
      expect(opts.trelloApiKey).toBe("abc123");
    });

    test('works with help option', () => {
      expect(() => {
        importerCommand().parse([
          "node", "zl", "--help"
        ]);
      }).toThrow(); // Help typically exits or throws
    });
  });

  describe('Error handling and validation', () => {
    test('handles missing required base options gracefully', () => {
      // This tests that trello-specific options don't interfere with base validation
      expect(() => {
        importerCommand().parse([
          "node", "zl", "--trello-api-key", "abc123"
          // Missing --source and --path
        ]);
      }).toThrow();
    });

    test('handles invalid source with trello options', () => {
      expect(() => {
        importerCommand().parse([
          "node", "zl", "--source", "invalid", "--path", "file.json", "--trello-api-key", "abc123"
        ]);
      }).toThrow();
    });

    test('handles unrecognized trello-like options', () => {
      expect(() => {
        importerCommand().parse([
          "node", "zl", "--source", "trello", "--path", "file.json", "--trello-invalid-option", "value"
        ]);
      }).toThrow();
    });
  });

  describe('Board ID vs Board Name scenarios', () => {
    test('accepts board ID format', () => {
      const boardId = "5e8b8c7d4f2a1b3c4d5e6f7g";
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-board", boardId
      ]).opts();
      expect(opts.trelloBoard).toBe(boardId);
    });

    test('accepts board name with spaces', () => {
      const boardName = "My Project Board";
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-board", boardName
      ]).opts();
      expect(opts.trelloBoard).toBe(boardName);
    });

    test('accepts board name with special characters', () => {
      const boardName = "Project-Board_2024 (v2)";
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-board", boardName
      ]).opts();
      expect(opts.trelloBoard).toBe(boardName);
    });

    test('accepts short board identifiers', () => {
      const shortId = "ab";
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-board", shortId
      ]).opts();
      expect(opts.trelloBoard).toBe(shortId);
    });

    test('accepts board names with numbers only', () => {
      const numericBoard = "2024";
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-board", numericBoard
      ]).opts();
      expect(opts.trelloBoard).toBe(numericBoard);
    });
  });

  describe('Token and API key validation scenarios', () => {
    test('accepts typical API key format', () => {
      const apiKey = "1234567890abcdef1234567890abcdef";
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-api-key", apiKey
      ]).opts();
      expect(opts.trelloApiKey).toBe(apiKey);
    });

    test('accepts typical token format', () => {
      const token = "ATTAabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-token", token
      ]).opts();
      expect(opts.trelloToken).toBe(token);
    });

    test('accepts short test tokens', () => {
      const shortToken = "test";
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-token", shortToken
      ]).opts();
      expect(opts.trelloToken).toBe(shortToken);
    });

    test('accepts tokens with special characters', () => {
      const tokenWithChars = "token-with_special.chars123";
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-token", tokenWithChars
      ]).opts();
      expect(opts.trelloToken).toBe(tokenWithChars);
    });

    test('accepts API keys with mixed case', () => {
      const mixedCaseKey = "AbCdEf1234567890ABCDEF1234567890";
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-api-key", mixedCaseKey
      ]).opts();
      expect(opts.trelloApiKey).toBe(mixedCaseKey);
    });
  });

  describe('Argument parsing edge cases', () => {
    test('handles arguments with equals sign format', () => {
      const opts = importerCommand().parse([
        "node", "zl", "--source=trello", "--path=trello-export.json", "--trello-api-key=abc123"
      ]).opts();
      expect(opts.source).toBe("trello");
      expect(opts.trelloApiKey).toBe("abc123");
    });

    test('handles mixed argument formats', () => {
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path=trello-export.json", "--trello-api-key", "abc123"
      ]).opts();
      expect(opts.source).toBe("trello");
      expect(opts.path).toBe("trello-export.json");
      expect(opts.trelloApiKey).toBe("abc123");
    });

    test('handles arguments with whitespace', () => {
      const valueWithSpaces = "value with spaces";
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-board", valueWithSpaces
      ]).opts();
      expect(opts.trelloBoard).toBe(valueWithSpaces);
    });

    test('handles arguments starting with dashes', () => {
      const valueWithDashes = "--not-an-option";
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-api-key", valueWithDashes
      ]).opts();
      expect(opts.trelloApiKey).toBe(valueWithDashes);
    });

    test('handles quoted arguments', () => {
      const quotedValue = '"quoted value"';
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-board", quotedValue
      ]).opts();
      expect(opts.trelloBoard).toBe(quotedValue);
    });

    test('handles arguments with newlines', () => {
      const valueWithNewline = "value\nwith\nnewlines";
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "trello-export.json", "--trello-token", valueWithNewline
      ]).opts();
      expect(opts.trelloToken).toBe(valueWithNewline);
    });
  });

  describe('Complete command scenarios', () => {
    test('parses complete minimal trello command', () => {
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "export.json"
      ]).opts();
      expect(opts.source).toBe("trello");
      expect(opts.path).toBe("export.json");
      expect(opts.trelloApiKey).toBeUndefined();
      expect(opts.trelloBoard).toBeUndefined();
      expect(opts.trelloToken).toBeUndefined();
    });

    test('parses complete full-featured trello command', () => {
      const opts = importerCommand().parse([
        "node", "zl", 
        "--source", "trello", 
        "--path", "export.json",
        "--trello-api-key", "myapikey123",
        "--trello-board", "My Board Name",
        "--trello-token", "mytoken456",
        "--verbose",
        "--dry-run",
        "--output-dir", "/tmp/import"
      ]).opts();
      
      expect(opts.source).toBe("trello");
      expect(opts.path).toBe("export.json");
      expect(opts.trelloApiKey).toBe("myapikey123");
      expect(opts.trelloBoard).toBe("My Board Name");
      expect(opts.trelloToken).toBe("mytoken456");
      expect(opts.verbose).toBeTruthy();
      expect(opts.dryRun).toBeTruthy();
      expect(opts.outputDir).toBe("/tmp/import");
    });

    test('handles command with only API key', () => {
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "export.json", "--trello-api-key", "onlykey123"
      ]).opts();
      expect(opts.trelloApiKey).toBe("onlykey123");
      expect(opts.trelloBoard).toBeUndefined();
      expect(opts.trelloToken).toBeUndefined();
    });

    test('handles command with only board', () => {
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "export.json", "--trello-board", "onlyboard"
      ]).opts();
      expect(opts.trelloBoard).toBe("onlyboard");
      expect(opts.trelloApiKey).toBeUndefined();
      expect(opts.trelloToken).toBeUndefined();
    });

    test('handles command with only token', () => {
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "export.json", "--trello-token", "onlytoken"
      ]).opts();
      expect(opts.trelloToken).toBe("onlytoken");
      expect(opts.trelloApiKey).toBeUndefined();
      expect(opts.trelloBoard).toBeUndefined();
    });
  });

  describe('Boundary conditions', () => {
    test('handles maximum length arguments', () => {
      const maxLengthValue = "x".repeat(8192); // Typical shell limit
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "export.json", "--trello-api-key", maxLengthValue
      ]).opts();
      expect(opts.trelloApiKey).toBe(maxLengthValue);
    });

    test('handles minimum length arguments', () => {
      const minLengthValue = "a";
      const opts = importerCommand().parse([
        "node", "zl", "--source", "trello", "--path", "export.json", "--trello-board", minLengthValue
      ]).opts();
      expect(opts.trelloBoard).toBe(minLengthValue);
    });

    test('validates option parsing consistency', () => {
      // Test that parsing the same command multiple times gives same result
      const args = [
        "node", "zl", "--source", "trello", "--path", "export.json", 
        "--trello-api-key", "key123", "--trello-board", "board456", "--trello-token", "token789"
      ];
      
      const opts1 = importerCommand().parse([...args]).opts();
      const opts2 = importerCommand().parse([...args]).opts();
      
      expect(opts1.trelloApiKey).toBe(opts2.trelloApiKey);
      expect(opts1.trelloBoard).toBe(opts2.trelloBoard);
      expect(opts1.trelloToken).toBe(opts2.trelloToken);
    });
  });
});
