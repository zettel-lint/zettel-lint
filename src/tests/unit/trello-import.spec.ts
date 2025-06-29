import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TrelloImporter } from '../../trello-import.js';

// Mock external dependencies
vi.mock('axios');
vi.mock('fs/promises');
vi.mock('path');

describe('TrelloImporter', () => {
  let trelloImporter: TrelloImporter;
  let mockAxios: any;
  let mockFs: any;
  let mockPath: any;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Initialize mock dependencies
    mockAxios = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      create: vi.fn().mockReturnValue({
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn()
      })
    };
    
    mockFs = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      access: vi.fn(),
      mkdir: vi.fn(),
      stat: vi.fn()
    };
    
    mockPath = {
      dirname: vi.fn(),
      join: vi.fn(),
      resolve: vi.fn(),
      extname: vi.fn()
    };

    trelloImporter = new TrelloImporter({
      apiKey: 'test-api-key',
      token: 'test-token'
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with valid configuration', () => {
      expect(trelloImporter).toBeInstanceOf(TrelloImporter);
      expect(trelloImporter.getApiKey()).toBe('test-api-key');
      expect(trelloImporter.getToken()).toBe('test-token');
    });

    it('should throw error when api key is missing', () => {
      expect(() => {
        new TrelloImporter({
          apiKey: '',
          token: 'test-token'
        });
      }).toThrow('API key is required');
    });

    it('should throw error when token is missing', () => {
      expect(() => {
        new TrelloImporter({
          apiKey: 'test-api-key',
          token: ''
        });
      }).toThrow('Token is required');
    });

    it('should throw error when both api key and token are missing', () => {
      expect(() => {
        new TrelloImporter({
          apiKey: '',
          token: ''
        });
      }).toThrow('API key and token are required');
    });

    it('should use default base URL when not provided', () => {
      const importer = new TrelloImporter({
        apiKey: 'test-api-key',
        token: 'test-token'
      });
      expect(importer.getBaseUrl()).toBe('https://api.trello.com/1');
    });

    it('should accept custom base URL', () => {
      const customUrl = 'https://custom-trello-api.com/v1';
      const importer = new TrelloImporter({
        apiKey: 'test-api-key',
        token: 'test-token',
        baseUrl: customUrl
      });
      expect(importer.getBaseUrl()).toBe(customUrl);
    });
  });

  describe('getBoards', () => {
    it('should fetch boards successfully', async () => {
      const mockBoards = [
        { id: '1', name: 'Board 1', closed: false, url: 'https://trello.com/b/1' },
        { id: '2', name: 'Board 2', closed: false, url: 'https://trello.com/b/2' }
      ];
      
      vi.mocked(mockAxios.get).mockResolvedValue({ data: mockBoards });

      const result = await trelloImporter.getBoards();

      expect(mockAxios.get).toHaveBeenCalledWith(
        'https://api.trello.com/1/members/me/boards',
        expect.objectContaining({
          params: expect.objectContaining({
            key: 'test-api-key',
            token: 'test-token'
          })
        })
      );
      expect(result).toEqual(mockBoards);
    });

    it('should handle API errors gracefully', async () => {
      const apiError = new Error('API Error');
      vi.mocked(mockAxios.get).mockRejectedValue(apiError);

      await expect(trelloImporter.getBoards()).rejects.toThrow('Failed to fetch boards: API Error');
    });

    it('should filter closed boards by default', async () => {
      const mockBoards = [
        { id: '1', name: 'Board 1', closed: false },
        { id: '2', name: 'Board 2', closed: true }
      ];
      vi.mocked(mockAxios.get).mockResolvedValue({ data: mockBoards });

      const result = await trelloImporter.getBoards();

      expect(result).toHaveLength(1);
      expect(result[0].closed).toBe(false);
    });

    it('should include closed boards when requested', async () => {
      const mockBoards = [
        { id: '1', name: 'Board 1', closed: false },
        { id: '2', name: 'Board 2', closed: true }
      ];
      vi.mocked(mockAxios.get).mockResolvedValue({ data: mockBoards });

      const result = await trelloImporter.getBoards({ includeClosed: true });

      expect(result).toHaveLength(2);
    });

    it('should handle empty boards response', async () => {
      vi.mocked(mockAxios.get).mockResolvedValue({ data: [] });

      const result = await trelloImporter.getBoards();

      expect(result).toEqual([]);
    });

    it('should handle malformed API response', async () => {
      vi.mocked(mockAxios.get).mockResolvedValue({ data: null });

      await expect(trelloImporter.getBoards()).rejects.toThrow('Invalid API response');
    });
  });

  describe('getBoardDetails', () => {
    it('should fetch board details with cards and lists', async () => {
      const boardId = 'test-board-id';
      const mockBoardDetails = {
        id: boardId,
        name: 'Test Board',
        desc: 'Test board description',
        closed: false,
        lists: [
          { 
            id: 'list1', 
            name: 'To Do', 
            closed: false,
            cards: [
              { id: 'card1', name: 'Task 1', desc: 'Task description', closed: false }
            ]
          },
          { 
            id: 'list2', 
            name: 'In Progress', 
            closed: false,
            cards: []
          }
        ]
      };
      vi.mocked(mockAxios.get).mockResolvedValue({ data: mockBoardDetails });

      const result = await trelloImporter.getBoardDetails(boardId);

      expect(mockAxios.get).toHaveBeenCalledWith(
        `https://api.trello.com/1/boards/${boardId}`,
        expect.objectContaining({
          params: expect.objectContaining({
            key: 'test-api-key',
            token: 'test-token',
            cards: 'open',
            lists: 'open'
          })
        })
      );
      expect(result).toEqual(mockBoardDetails);
    });

    it('should handle invalid board ID', async () => {
      const invalidBoardId = 'invalid-id';
      const apiError = new Error('Board not found');
      apiError.response = { status: 404 };
      vi.mocked(mockAxios.get).mockRejectedValue(apiError);

      await expect(trelloImporter.getBoardDetails(invalidBoardId)).rejects.toThrow('Failed to fetch board details: Board not found');
    });

    it('should include archived items when requested', async () => {
      const boardId = 'test-board-id';
      const mockBoardDetails = { 
        id: boardId, 
        name: 'Test Board',
        lists: []
      };
      vi.mocked(mockAxios.get).mockResolvedValue({ data: mockBoardDetails });

      await trelloImporter.getBoardDetails(boardId, { includeArchived: true });

      expect(mockAxios.get).toHaveBeenCalledWith(
        `https://api.trello.com/1/boards/${boardId}`,
        expect.objectContaining({
          params: expect.objectContaining({
            cards: 'all',
            lists: 'all'
          })
        })
      );
    });

    it('should throw error for empty board ID', async () => {
      await expect(trelloImporter.getBoardDetails('')).rejects.toThrow('Board ID is required');
    });

    it('should throw error for null board ID', async () => {
      await expect(trelloImporter.getBoardDetails(null as any)).rejects.toThrow('Board ID is required');
    });
  });

  describe('exportBoard', () => {
    it('should export board to JSON file', async () => {
      const boardId = 'test-board-id';
      const outputPath = './exports/board.json';
      const mockBoardData = {
        id: boardId,
        name: 'Test Board',
        desc: 'Test description',
        lists: [
          {
            id: 'list1',
            name: 'To Do',
            cards: [
              { id: 'card1', name: 'Task 1', desc: 'Description 1' }
            ]
          }
        ]
      };

      vi.mocked(mockAxios.get).mockResolvedValue({ data: mockBoardData });
      vi.mocked(mockFs.access).mockRejectedValue(new Error('Directory does not exist'));
      vi.mocked(mockFs.mkdir).mockResolvedValue(undefined);
      vi.mocked(mockFs.writeFile).mockResolvedValue(undefined);
      vi.mocked(mockPath.dirname).mockReturnValue('./exports');

      const result = await trelloImporter.exportBoard(boardId, outputPath);

      expect(mockFs.mkdir).toHaveBeenCalledWith('./exports', { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        outputPath,
        JSON.stringify(mockBoardData, null, 2),
        'utf8'
      );
      expect(result).toEqual({ success: true, path: outputPath, boardId });
    });

    it('should handle file system errors during export', async () => {
      const boardId = 'test-board-id';
      const outputPath = './exports/board.json';
      const mockBoardData = { id: boardId, name: 'Test Board' };

      vi.mocked(mockAxios.get).mockResolvedValue({ data: mockBoardData });
      vi.mocked(mockFs.access).mockRejectedValue(new Error('Directory does not exist'));
      vi.mocked(mockFs.mkdir).mockResolvedValue(undefined);
      vi.mocked(mockFs.writeFile).mockRejectedValue(new Error('Permission denied'));
      vi.mocked(mockPath.dirname).mockReturnValue('./exports');

      await expect(trelloImporter.exportBoard(boardId, outputPath)).rejects.toThrow('Failed to export board: Permission denied');
    });

    it('should create directory if it does not exist', async () => {
      const boardId = 'test-board-id';
      const outputPath = './new-exports/board.json';
      const mockBoardData = { id: boardId, name: 'Test Board' };

      vi.mocked(mockAxios.get).mockResolvedValue({ data: mockBoardData });
      vi.mocked(mockFs.access).mockRejectedValue(new Error('Directory does not exist'));
      vi.mocked(mockFs.mkdir).mockResolvedValue(undefined);
      vi.mocked(mockFs.writeFile).mockResolvedValue(undefined);
      vi.mocked(mockPath.dirname).mockReturnValue('./new-exports');

      await trelloImporter.exportBoard(boardId, outputPath);

      expect(mockFs.mkdir).toHaveBeenCalledWith('./new-exports', { recursive: true });
    });

    it('should not create directory if it already exists', async () => {
      const boardId = 'test-board-id';
      const outputPath = './existing-exports/board.json';
      const mockBoardData = { id: boardId, name: 'Test Board' };

      vi.mocked(mockAxios.get).mockResolvedValue({ data: mockBoardData });
      vi.mocked(mockFs.access).mockResolvedValue(undefined);
      vi.mocked(mockFs.writeFile).mockResolvedValue(undefined);
      vi.mocked(mockPath.dirname).mockReturnValue('./existing-exports');

      await trelloImporter.exportBoard(boardId, outputPath);

      expect(mockFs.mkdir).not.toHaveBeenCalled();
    });

    it('should handle invalid output path', async () => {
      const boardId = 'test-board-id';
      const outputPath = '';

      await expect(trelloImporter.exportBoard(boardId, outputPath)).rejects.toThrow('Output path is required');
    });
  });

  describe('importFromFile', () => {
    it('should import board data from JSON file', async () => {
      const filePath = './imports/board.json';
      const mockBoardData = {
        id: 'imported-board-id',
        name: 'Imported Board',
        desc: 'Imported board description',
        lists: [
          {
            id: 'list1',
            name: 'To Do',
            cards: [
              { id: 'card1', name: 'Task 1', desc: 'Description 1' }
            ]
          }
        ]
      };

      vi.mocked(mockFs.access).mockResolvedValue(undefined);
      vi.mocked(mockFs.readFile).mockResolvedValue(JSON.stringify(mockBoardData));

      const result = await trelloImporter.importFromFile(filePath);

      expect(mockFs.readFile).toHaveBeenCalledWith(filePath, 'utf8');
      expect(result).toEqual(mockBoardData);
    });

    it('should handle file not found error', async () => {
      const filePath = './imports/nonexistent.json';

      vi.mocked(mockFs.access).mockRejectedValue(new Error('File not found'));

      await expect(trelloImporter.importFromFile(filePath)).rejects.toThrow('File not found: ./imports/nonexistent.json');
    });

    it('should handle invalid JSON format', async () => {
      const filePath = './imports/invalid.json';

      vi.mocked(mockFs.access).mockResolvedValue(undefined);
      vi.mocked(mockFs.readFile).mockResolvedValue('invalid json content');

      await expect(trelloImporter.importFromFile(filePath)).rejects.toThrow('Invalid JSON format in file: ./imports/invalid.json');
    });

    it('should validate board data structure after import', async () => {
      const filePath = './imports/board.json';
      const invalidBoardData = { invalidField: 'value' };

      vi.mocked(mockFs.access).mockResolvedValue(undefined);
      vi.mocked(mockFs.readFile).mockResolvedValue(JSON.stringify(invalidBoardData));

      await expect(trelloImporter.importFromFile(filePath)).rejects.toThrow('Invalid board data structure');
    });

    it('should handle empty file', async () => {
      const filePath = './imports/empty.json';

      vi.mocked(mockFs.access).mockResolvedValue(undefined);
      vi.mocked(mockFs.readFile).mockResolvedValue('');

      await expect(trelloImporter.importFromFile(filePath)).rejects.toThrow('File is empty: ./imports/empty.json');
    });

    it('should validate file extension', async () => {
      const filePath = './imports/board.txt';

      await expect(trelloImporter.importFromFile(filePath)).rejects.toThrow('File must have .json extension');
    });
  });

  describe('createBoard', () => {
    it('should create a new board with minimal parameters', async () => {
      const boardName = 'New Test Board';
      const mockCreatedBoard = {
        id: 'new-board-id',
        name: boardName,
        url: 'https://trello.com/b/new-board-id/new-test-board',
        closed: false
      };

      vi.mocked(mockAxios.post).mockResolvedValue({ data: mockCreatedBoard });

      const result = await trelloImporter.createBoard(boardName);

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://api.trello.com/1/boards',
        expect.objectContaining({
          name: boardName,
          key: 'test-api-key',
          token: 'test-token'
        })
      );
      expect(result).toEqual(mockCreatedBoard);
    });

    it('should handle board creation errors', async () => {
      const boardName = 'New Test Board';
      const apiError = new Error('Board creation failed');

      vi.mocked(mockAxios.post).mockRejectedValue(apiError);

      await expect(trelloImporter.createBoard(boardName)).rejects.toThrow('Failed to create board: Board creation failed');
    });

    it('should create board with additional options', async () => {
      const boardName = 'New Test Board';
      const options = {
        desc: 'Board description',
        defaultLists: false,
        prefs_permissionLevel: 'private'
      };
      const mockCreatedBoard = { 
        id: 'new-board-id', 
        name: boardName,
        desc: options.desc
      };

      vi.mocked(mockAxios.post).mockResolvedValue({ data: mockCreatedBoard });

      const result = await trelloImporter.createBoard(boardName, options);

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://api.trello.com/1/boards',
        expect.objectContaining({
          name: boardName,
          desc: options.desc,
          defaultLists: options.defaultLists,
          prefs_permissionLevel: options.prefs_permissionLevel,
          key: 'test-api-key',
          token: 'test-token'
        })
      );
      expect(result).toEqual(mockCreatedBoard);
    });

    it('should throw error for empty board name', async () => {
      await expect(trelloImporter.createBoard('')).rejects.toThrow('Board name is required');
    });

    it('should throw error for null board name', async () => {
      await expect(trelloImporter.createBoard(null as any)).rejects.toThrow('Board name is required');
    });

    it('should handle board name that is too long', async () => {
      const longName = 'a'.repeat(256);
      await expect(trelloImporter.createBoard(longName)).rejects.toThrow('Board name is too long (max 255 characters)');
    });
  });

  describe('duplicateBoard', () => {
    it('should duplicate an existing board', async () => {
      const sourceBoardId = 'source-board-id';
      const newBoardName = 'Duplicated Board';
      
      const mockSourceBoard = {
        id: sourceBoardId,
        name: 'Source Board',
        desc: 'Source description',
        lists: [
          {
            id: 'list1',
            name: 'To Do',
            cards: [
              { id: 'card1', name: 'Task 1', desc: 'Description 1' }
            ]
          }
        ]
      };

      const mockNewBoard = {
        id: 'new-board-id',
        name: newBoardName,
        desc: 'Source description'
      };

      vi.mocked(mockAxios.get).mockResolvedValue({ data: mockSourceBoard });
      vi.mocked(mockAxios.post).mockResolvedValue({ data: mockNewBoard });

      const result = await trelloImporter.duplicateBoard(sourceBoardId, newBoardName);

      expect(mockAxios.get).toHaveBeenCalledWith(
        `https://api.trello.com/1/boards/${sourceBoardId}`,
        expect.objectContaining({
          params: expect.objectContaining({
            key: 'test-api-key',
            token: 'test-token'
          })
        })
      );
      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://api.trello.com/1/boards',
        expect.objectContaining({
          name: newBoardName,
          idBoardSource: sourceBoardId,
          key: 'test-api-key',
          token: 'test-token'
        })
      );
      expect(result).toEqual(mockNewBoard);
    });

    it('should handle source board not found', async () => {
      const sourceBoardId = 'nonexistent-board-id';
      const newBoardName = 'Duplicated Board';

      const apiError = new Error('Board not found');
      apiError.response = { status: 404 };
      vi.mocked(mockAxios.get).mockRejectedValue(apiError);

      await expect(trelloImporter.duplicateBoard(sourceBoardId, newBoardName)).rejects.toThrow('Failed to duplicate board: Board not found');
    });

    it('should throw error for empty source board ID', async () => {
      await expect(trelloImporter.duplicateBoard('', 'New Board')).rejects.toThrow('Source board ID is required');
    });

    it('should throw error for empty new board name', async () => {
      await expect(trelloImporter.duplicateBoard('board-id', '')).rejects.toThrow('New board name is required');
    });
  });

  describe('validateBoardData', () => {
    it('should validate correct board data structure', () => {
      const validBoardData = {
        id: 'board-id',
        name: 'Test Board',
        desc: 'Board description',
        closed: false,
        lists: [
          {
            id: 'list-id',
            name: 'List Name',
            closed: false,
            cards: [
              {
                id: 'card-id',
                name: 'Card Name',
                desc: 'Card Description',
                closed: false
              }
            ]
          }
        ]
      };

      expect(() => trelloImporter.validateBoardData(validBoardData)).not.toThrow();
    });

    it('should reject board data without required fields', () => {
      const invalidBoardData = {
        name: 'Test Board'
        // Missing id
      };

      expect(() => trelloImporter.validateBoardData(invalidBoardData)).toThrow('Board data must have id and name');
    });

    it('should reject board data with invalid lists structure', () => {
      const invalidBoardData = {
        id: 'board-id',
        name: 'Test Board',
        lists: 'invalid-lists-structure'
      };

      expect(() => trelloImporter.validateBoardData(invalidBoardData)).toThrow('Board lists must be an array');
    });

    it('should reject board data with invalid cards structure', () => {
      const invalidBoardData = {
        id: 'board-id',
        name: 'Test Board',
        lists: [
          {
            id: 'list-id',
            name: 'List Name',
            cards: 'invalid-cards-structure'
          }
        ]
      };

      expect(() => trelloImporter.validateBoardData(invalidBoardData)).toThrow('List cards must be an array');
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalValidData = {
        id: 'board-id',
        name: 'Test Board',
        lists: []
      };

      expect(() => trelloImporter.validateBoardData(minimalValidData)).not.toThrow();
    });

    it('should validate list structure within board', () => {
      const invalidListData = {
        id: 'board-id',
        name: 'Test Board',
        lists: [
          {
            // Missing id and name
            cards: []
          }
        ]
      };

      expect(() => trelloImporter.validateBoardData(invalidListData)).toThrow('List must have id and name');
    });

    it('should validate card structure within lists', () => {
      const invalidCardData = {
        id: 'board-id',
        name: 'Test Board',
        lists: [
          {
            id: 'list-id',
            name: 'List Name',
            cards: [
              {
                // Missing id and name
                desc: 'Some description'
              }
            ]
          }
        ]
      };

      expect(() => trelloImporter.validateBoardData(invalidCardData)).toThrow('Card must have id and name');
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.code = 'ECONNABORTED';
      vi.mocked(mockAxios.get).mockRejectedValue(timeoutError);

      await expect(trelloImporter.getBoards()).rejects.toThrow('Failed to fetch boards: Network timeout');
    });

    it('should handle rate limiting with retry logic', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.response = { status: 429, headers: { 'retry-after': '60' } };
      vi.mocked(mockAxios.get).mockRejectedValueOnce(rateLimitError);
      
      const mockBoards = [{ id: '1', name: 'Board 1' }];
      vi.mocked(mockAxios.get).mockResolvedValueOnce({ data: mockBoards });

      const result = await trelloImporter.getBoards({ retryOnRateLimit: true });

      expect(mockAxios.get).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockBoards);
    });

    it('should handle concurrent requests gracefully', async () => {
      const mockBoards = [{ id: '1', name: 'Board 1' }];
      vi.mocked(mockAxios.get).mockResolvedValue({ data: mockBoards });

      const promises = Array.from({ length: 5 }, () => trelloImporter.getBoards());
      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toEqual(mockBoards);
      });
    });

    it('should handle malformed JSON responses', async () => {
      vi.mocked(mockAxios.get).mockResolvedValue({ data: 'invalid-json' });

      await expect(trelloImporter.getBoards()).rejects.toThrow('Invalid API response format');
    });

    it('should handle HTTP error status codes', async () => {
      const httpError = new Error('Request failed');
      httpError.response = { status: 500, statusText: 'Internal Server Error' };
      vi.mocked(mockAxios.get).mockRejectedValue(httpError);

      await expect(trelloImporter.getBoards()).rejects.toThrow('Failed to fetch boards: Request failed');
    });
  });

  describe('authentication and authorization', () => {
    it('should handle invalid API key', async () => {
      const authError = new Error('Invalid API key');
      authError.response = { status: 401, data: { message: 'unauthorized' } };
      vi.mocked(mockAxios.get).mockRejectedValue(authError);

      await expect(trelloImporter.getBoards()).rejects.toThrow('Failed to fetch boards: Invalid API key');
    });

    it('should handle insufficient permissions', async () => {
      const permissionError = new Error('Insufficient permissions');
      permissionError.response = { status: 403, data: { message: 'forbidden' } };
      vi.mocked(mockAxios.get).mockRejectedValue(permissionError);

      await expect(trelloImporter.getBoards()).rejects.toThrow('Failed to fetch boards: Insufficient permissions');
    });

    it('should validate API key format', () => {
      expect(() => {
        new TrelloImporter({
          apiKey: 'invalid-key',
          token: 'test-token'
        });
      }).toThrow('Invalid API key format');
    });

    it('should validate token format', () => {
      expect(() => {
        new TrelloImporter({
          apiKey: 'valid-api-key-32-chars-long-123',
          token: 'invalid-token'
        });
      }).toThrow('Invalid token format');
    });
  });

  describe('data transformation and formatting', () => {
    it('should transform board data to internal format', () => {
      const trelloBoardData = {
        id: 'trello-board-id',
        name: 'Trello Board',
        desc: 'Board description',
        closed: false,
        lists: [
          {
            id: 'trello-list-id',
            name: 'Trello List',
            closed: false,
            cards: [
              {
                id: 'trello-card-id',
                name: 'Trello Card',
                desc: 'Card description',
                due: '2023-12-31T23:59:59.000Z',
                closed: false
              }
            ]
          }
        ]
      };

      const result = trelloImporter.transformBoardData(trelloBoardData);

      expect(result).toEqual({
        id: 'trello-board-id',
        title: 'Trello Board',
        description: 'Board description',
        isArchived: false,
        columns: [
          {
            id: 'trello-list-id',
            title: 'Trello List',
            isArchived: false,
            tasks: [
              {
                id: 'trello-card-id',
                title: 'Trello Card',
                description: 'Card description',
                dueDate: '2023-12-31T23:59:59.000Z',
                isArchived: false
              }
            ]
          }
        ]
      });
    });

    it('should handle missing optional fields in transformation', () => {
      const minimalBoardData = {
        id: 'board-id',
        name: 'Board Name',
        lists: []
      };

      const result = trelloImporter.transformBoardData(minimalBoardData);

      expect(result).toEqual({
        id: 'board-id',
        title: 'Board Name',
        description: '',
        isArchived: false,
        columns: []
      });
    });

    it('should format dates correctly', () => {
      const cardWithDate = {
        id: 'card-id',
        name: 'Card Name',
        due: '2023-12-31T23:59:59.000Z'
      };

      const result = trelloImporter.formatCardData(cardWithDate);

      expect(result.dueDate).toBe('2023-12-31T23:59:59.000Z');
      expect(result.formattedDueDate).toBe('December 31, 2023');
    });

    it('should handle invalid date formats gracefully', () => {
      const cardWithInvalidDate = {
        id: 'card-id',
        name: 'Card Name',
        due: 'invalid-date'
      };

      const result = trelloImporter.formatCardData(cardWithInvalidDate);

      expect(result.dueDate).toBe('invalid-date');
      expect(result.formattedDueDate).toBe('Invalid Date');
    });
  });

  describe('batch operations', () => {
    it('should handle batch board export', async () => {
      const boardIds = ['board1', 'board2', 'board3'];
      const outputDir = './batch-exports';
      
      const mockBoardData = (id: string) => ({
        id: id,
        name: `Board ${id}`,
        lists: []
      });

      vi.mocked(mockAxios.get).mockImplementation((url: string) => {
        const boardId = url.split('/').pop()?.split('?')[0];
        return Promise.resolve({ data: mockBoardData(boardId || 'unknown') });
      });
      
      vi.mocked(mockFs.access).mockRejectedValue(new Error('Directory does not exist'));
      vi.mocked(mockFs.mkdir).mockResolvedValue(undefined);
      vi.mocked(mockFs.writeFile).mockResolvedValue(undefined);
      vi.mocked(mockPath.dirname).mockReturnValue(outputDir);
      vi.mocked(mockPath.join).mockImplementation((...args) => args.join('/'));

      const results = await trelloImporter.batchExportBoards(boardIds, outputDir);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalledTimes(3);
      expect(mockFs.mkdir).toHaveBeenCalledWith(outputDir, { recursive: true });
    });

    it('should handle partial failures in batch operations', async () => {
      const boardIds = ['board1', 'board2', 'board3'];
      const outputDir = './batch-exports';

      vi.mocked(mockAxios.get).mockImplementation((url: string) => {
        const boardId = url.split('/').pop()?.split('?')[0];
        if (boardId === 'board2') {
          return Promise.reject(new Error('Board not found'));
        }
        return Promise.resolve({ data: { id: boardId, name: `Board ${boardId}` } });
      });

      vi.mocked(mockFs.access).mockRejectedValue(new Error('Directory does not exist'));
      vi.mocked(mockFs.mkdir).mockResolvedValue(undefined);
      vi.mocked(mockFs.writeFile).mockResolvedValue(undefined);
      vi.mocked(mockPath.dirname).mockReturnValue(outputDir);
      vi.mocked(mockPath.join).mockImplementation((...args) => args.join('/'));

      const results = await trelloImporter.batchExportBoards(boardIds, outputDir);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe('Board not found');
      expect(results[2].success).toBe(true);
    });

    it('should limit concurrent requests in batch operations', async () => {
      const boardIds = Array.from({ length: 10 }, (_, i) => `board${i}`);
      const outputDir = './batch-exports';
      const concurrencyLimit = 3;

      vi.mocked(mockAxios.get).mockImplementation(() => 
        Promise.resolve({ data: { id: 'test', name: 'Test Board' } })
      );
      vi.mocked(mockFs.access).mockRejectedValue(new Error('Directory does not exist'));
      vi.mocked(mockFs.mkdir).mockResolvedValue(undefined);
      vi.mocked(mockFs.writeFile).mockResolvedValue(undefined);
      vi.mocked(mockPath.dirname).mockReturnValue(outputDir);
      vi.mocked(mockPath.join).mockImplementation((...args) => args.join('/'));

      const results = await trelloImporter.batchExportBoards(boardIds, outputDir, { concurrency: concurrencyLimit });

      expect(results).toHaveLength(10);
      expect(results.every(r => r.success)).toBe(true);
    });
  });

  describe('caching and performance', () => {
    it('should cache board details for repeated requests', async () => {
      const boardId = 'test-board-id';
      const mockBoardData = { id: boardId, name: 'Test Board' };

      vi.mocked(mockAxios.get).mockResolvedValue({ data: mockBoardData });

      // First request
      const result1 = await trelloImporter.getBoardDetails(boardId, { useCache: true });
      // Second request (should use cache)
      const result2 = await trelloImporter.getBoardDetails(boardId, { useCache: true });

      expect(mockAxios.get).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(mockBoardData);
      expect(result2).toEqual(mockBoardData);
    });

    it('should bypass cache when requested', async () => {
      const boardId = 'test-board-id';
      const mockBoardData = { id: boardId, name: 'Test Board' };

      vi.mocked(mockAxios.get).mockResolvedValue({ data: mockBoardData });

      // First request with cache
      await trelloImporter.getBoardDetails(boardId, { useCache: true });
      // Second request bypassing cache
      await trelloImporter.getBoardDetails(boardId, { useCache: false });

      expect(mockAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should clear cache when requested', async () => {
      const boardId = 'test-board-id';
      const mockBoardData = { id: boardId, name: 'Test Board' };

      vi.mocked(mockAxios.get).mockResolvedValue({ data: mockBoardData });

      // First request with cache
      await trelloImporter.getBoardDetails(boardId, { useCache: true });
      
      // Clear cache
      trelloImporter.clearCache();
      
      // Second request (should not use cache)
      await trelloImporter.getBoardDetails(boardId, { useCache: true });

      expect(mockAxios.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('webhook and real-time updates', () => {
    it('should set up webhook for board changes', async () => {
      const boardId = 'test-board-id';
      const callbackUrl = 'https://example.com/webhook';
      const mockWebhook = {
        id: 'webhook-id',
        idModel: boardId,
        callbackURL: callbackUrl,
        active: true
      };

      vi.mocked(mockAxios.post).mockResolvedValue({ data: mockWebhook });

      const result = await trelloImporter.createWebhook(boardId, callbackUrl);

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://api.trello.com/1/webhooks',
        expect.objectContaining({
          idModel: boardId,
          callbackURL: callbackUrl,
          key: 'test-api-key',
          token: 'test-token'
        })
      );
      expect(result).toEqual(mockWebhook);
    });

    it('should handle webhook validation', async () => {
      const webhookData = {
        model: { id: 'board-id' },
        action: { type: 'updateCard', data: { card: { name: 'Updated Card' } } }
      };

      const isValid = trelloImporter.validateWebhookData(webhookData);

      expect(isValid).toBe(true);
    });

    it('should reject invalid webhook data', async () => {
      const invalidWebhookData = {
        // Missing required fields
        someField: 'value'
      };

      const isValid = trelloImporter.validateWebhookData(invalidWebhookData);

      expect(isValid).toBe(false);
    });
  });
});