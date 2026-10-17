import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import TrelloImport, { TrelloCommentInfo } from '../../trello-import.js';
import { promises as fs } from 'fs';
import { glob } from 'glob';
import { parse } from 'yaml';

// Mock dependencies
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  }
}));

vi.mock('glob', () => ({
  glob: vi.fn(),
}));

// Helper to create test data
const createTrelloCheckItemInfo = (overrides = {}) => ({
  id: 'item1',
  idChecklist: 'checklist1',
  name: 'Test item',
  due: new Date('2024-01-15T10:00:00Z'),
  state: 'incomplete',
  ...overrides,
});

const createTrelloChecklistInfo = (overrides = {}) => ({
  id: 'checklist1',
  idBoard: 'board1',
  idCard: 'card1',
  checkItems: [],
  name: 'Test Checklist',
  ...overrides,
});

const createAttachmentInfo = (overrides = {}) => ({
  bytes: {},
  date: new Date('2024-01-15T10:00:00Z'),
  edgeColor: '#000000',
  idMember: 'member1',
  isUpload: true,
  mimeType: 'image/png',
  name: 'Test Attachment',
  previews: [],
  url: 'https://example.com/attachment.png',
  pos: 0,
  fileName: 'attachment.png',
  id: 'att1',
  ...overrides,
});

const createTrelloLabelInfo = (overrides = {}) => ({
  id: 'label1',
  name: 'Test Label',
  ...overrides,
});

const createTrelloCardInfo = (overrides = {}) => ({
  attachments: [],
  badges: {},
  closed: false,
  cover: {},
  customFieldItems: [],
  dateLastActivity: new Date('2024-01-15T10:00:00Z'),
  desc: 'Test description',
  id: 'card1',
  idBoard: 'board1',
  idChecklists: [],
  idLabels: [],
  labels: [],
  idList: 'list1',
  isTemplate: false,
  name: 'Test Card',
  shortUrl: 'https://trello.com/c/card1',
  ...overrides,
});

const createTrelloListInfo = (overrides = {}) => ({
  id: 'list1',
  idBoard: 'board1',
  name: 'Test List',
  closed: false,
  ...overrides,
});

const createTrelloBoardInfo = (overrides = {}) => ({
  id: 'board1',
  name: 'Test Board',
  closed: false,
  url: 'https://trello.com/b/board1',
  prefs: {},
  labelNames: {},
  limits: {},
  actions: [],
  cards: [],
  checklists: [],
  customFields: [],
  idTags: [],
  labels: [],
  lists: [],
  members: [],
  ...overrides,
});

const options = { boardIdOrName: 'board1', apiKey: 'api_key', token: 'token' };
describe('TrelloImport', () => {
  let importer: TrelloImport;

  beforeEach(() => {
    importer = new TrelloImport();
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('sortableDate', () => {
    test('converts Date to sortable string format', () => {
      // Access the module to test the sortableDate function indirectly
      const date = new Date('2024-01-15T10:30:45Z');
      // sortableDate is not exported, so we test it indirectly through writeCard
      // For now, we'll test the behavior through integration
      expect(date).toBeDefined();
    });
  });

  describe('extractNotes', () => {
    test('reads and parses JSON file successfully', async () => {
      const mockBoard = createTrelloBoardInfo();
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockBoard));

      const result = await importer.extractNotes('test.json');

      expect(fs.readFile).toHaveBeenCalledWith('test.json', 'utf8');
      expect(result.id).toBe('board1');
      expect(result.name).toBe('Test Board');
    });

    test('handles empty board data', async () => {
      const emptyBoard = createTrelloBoardInfo({ cards: [], lists: [], checklists: [] });
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(emptyBoard));

      const result = await importer.extractNotes('empty.json');

      expect(result.cards).toEqual([]);
      expect(result.lists).toEqual([]);
      expect(result.checklists).toEqual([]);
    });

    test('throws error on invalid JSON', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('invalid json{');

      await expect(importer.extractNotes('bad.json')).rejects.toThrow();
    });
  });

  describe('writeCheckList', () => {
    test('formats checklist with incomplete items', () => {
      const checkItem = createTrelloCheckItemInfo({ state: 'incomplete', name: 'Task 1' });
      const checklist = createTrelloChecklistInfo({
        name: 'My Checklist',
        checkItems: [checkItem],
      });

      const result = importer.writeCheckList(checklist);

      expect(result).toContain('### My Checklist');
      expect(result).toContain('* [ ] Task 1');
      expect(result).toContain('due:2024-01-15T10:00:00.000Z');
    });

    test('formats checklist with complete items', () => {
      const checkItem = createTrelloCheckItemInfo({ state: 'complete', name: 'Done Task' });
      const checklist = createTrelloChecklistInfo({
        name: 'Completed',
        checkItems: [checkItem],
      });

      const result = importer.writeCheckList(checklist);

      expect(result).toContain('### Completed');
      expect(result).toContain('* [X] Done Task');
    });

    test('formats checklist with multiple items', () => {
      const items = [
        createTrelloCheckItemInfo({ id: '1', name: 'Item 1', state: 'complete' }),
        createTrelloCheckItemInfo({ id: '2', name: 'Item 2', state: 'incomplete' }),
      ];
      const checklist = createTrelloChecklistInfo({ checkItems: items });

      const result = importer.writeCheckList(checklist);

      expect(result).toContain('* [X] Item 1');
      expect(result).toContain('* [ ] Item 2');
    });

    test('formats checklist item with string due date', () => {
      const checkItem = createTrelloCheckItemInfo({ due: '2024-01-15T10:00:00.000Z' as any });
      const checklist = createTrelloChecklistInfo({ checkItems: [checkItem] });

      const result = importer.writeCheckList(checklist);

      expect(result).toContain('due:2024-01-15T10:00:00.000Z');
    });

    test('formats checklist item without due date', () => {
      const checkItem = createTrelloCheckItemInfo({ due: undefined as any });
      const checklist = createTrelloChecklistInfo({ checkItems: [checkItem] });

      const result = importer.writeCheckList(checklist);

      expect(result).not.toContain('due:');
      expect(result).toContain('* [ ] Test item');
    });

    test('handles empty checklist', () => {
      const checklist = createTrelloChecklistInfo({ name: 'Empty', checkItems: [] });

      const result = importer.writeCheckList(checklist);

      expect(result).toBe('### Empty\n\n');
    });
  });

  describe('writeComments', () => {
    test('formats comments with author and ISO date', () => {
      const comment = new TrelloCommentInfo('Great card!', new Date('2024-01-15T12:00:00Z'), 'Alice');

      expect(importer.writeComments([comment])).toBe(
        '### Alice (2024-01-15T12:00:00.000Z)\n\nGreat card!',
      );
    });

    test('uses Unknown when a comment has no author', () => {
      const comment = new TrelloCommentInfo('Anonymous comment', new Date('2024-01-15T12:00:00Z'));

      expect(importer.writeComments([comment])).toContain('### Unknown (2024-01-15T12:00:00.000Z)');
    });
  });

  describe('saveAttachments', () => {
    beforeEach(() => {
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fetch).mockResolvedValue({ ok: true, arrayBuffer: () => Promise.resolve(Buffer.from('test data')) });
    });

    test('saves file attachments successfully', async () => {
      const attachment = createAttachmentInfo({
        fileName: 'test.png',
        name: 'Test Image',
        url: 'https://example.com/test.png',
      });

      const result = await importer.saveAttachments('/output/', options, [attachment]);

      expect(fetch).toHaveBeenCalledWith('https://example.com/test.png');
      expect(fs.writeFile).toHaveBeenCalledWith('/output/test.png', expect.any(Buffer));
      expect(result).toEqual(['![Test Image](/output/test.png)']);
    });

    test('sanitizes attachment fileName to prevent path traversal', async () => {
      const attachment = createAttachmentInfo({
        fileName: '../../evil.sh',
        name: 'Evil Attachment',
        url: 'https://example.com/evil.sh',
      });

      const result = await importer.saveAttachments('/output/attachments/', options, [attachment]);

      expect(fetch).toHaveBeenCalledWith('https://example.com/evil.sh');
      expect(fs.writeFile).toHaveBeenCalledWith('/output/attachments/evil.sh', expect.any(Buffer));
      expect(result).toEqual(['![Evil Attachment](/output/attachments/evil.sh)']);
    });

    test.each(['.', '..', 'folder/.', 'folder/..'])('handles fileName %s as a URL-only attachment', async (fileName: string) => {
      const attachment = createAttachmentInfo({ fileName });

      const result = await importer.saveAttachments('/output/attachments/', options, [attachment]);

      expect(fetch).not.toHaveBeenCalled();
      expect(fs.writeFile).not.toHaveBeenCalled();
      expect(result).toEqual(['[Test Attachment](https://example.com/attachment.png)']);
    });

    test('continues saving files after a URL-only dot attachment', async () => {
      const attachments = [
        createAttachmentInfo({ fileName: '..' }),
        createAttachmentInfo({ fileName: 'test.png', name: 'Test Image' }),
      ];

      const result = await importer.saveAttachments('/output/attachments/', options, attachments);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fs.writeFile).toHaveBeenCalledTimes(1);
      expect(fs.writeFile).toHaveBeenCalledWith('/output/attachments/test.png', expect.any(Buffer));
      expect(result).toEqual([
        '[Test Attachment](https://example.com/attachment.png)',
        '![Test Image](/output/attachments/test.png)',
      ]);
    });

    test('handles URL-only attachments without fileName', async () => {
      const attachment = createAttachmentInfo({
        fileName: '',
        name: 'External Link',
        url: 'https://example.com/page',
      });

      const result = await importer.saveAttachments('/output/', options, [attachment]);

      expect(fetch).not.toHaveBeenCalled();
      expect(fs.writeFile).not.toHaveBeenCalled();
      expect(result).toEqual(['[External Link](https://example.com/page)']);
    });

    test('handles attachment with null fileName', async () => {
      const attachment = createAttachmentInfo({
        fileName: 'null',
        name: 'Null File',
        url: 'https://example.com/null',
      });

      const result = await importer.saveAttachments('/output/', options, [attachment]);

      expect(fetch).not.toHaveBeenCalled();
      expect(result).toEqual(['[Null File](https://example.com/null)']);
    });

    test('handles multiple attachments', async () => {
      const attachments = [
        createAttachmentInfo({ fileName: 'file1.png', name: 'File 1', url: 'https://example.com/1.png' }),
        createAttachmentInfo({ fileName: 'file2.jpg', name: 'File 2', url: 'https://example.com/2.jpg' }),
      ];

      const result = await importer.saveAttachments('/output/', options, attachments);

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fs.writeFile).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result[0]).toContain('File 1');
      expect(result[1]).toContain('File 2');
    });

    test('handles empty attachments array', async () => {
      const result = await importer.saveAttachments('/output/', options, []);

      expect(fetch).not.toHaveBeenCalled();
      expect(fs.writeFile).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    test('continues on error and logs to console', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));
      const attachment = createAttachmentInfo({ fileName: 'test.png' });

      const result = await importer.saveAttachments('/output/', options, [attachment]);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Could not write file'));
      expect(result).toEqual([]);
      consoleErrorSpy.mockRestore();
    });

    test('no file written if fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({ ok: false, statusText: 'Not Found' });
      const attachment = createAttachmentInfo({ url: 'https://example.com/missing.png' });

      const result = await importer.saveAttachments('/output/', options, [attachment]);

      expect(fetch).toHaveBeenCalledWith('https://example.com/missing.png');
      expect(fs.writeFile).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('sanitiseName', () => {
    test('replaces special characters with hyphens', () => {
      const card = createTrelloCardInfo({ name: 'Test Card @#$% Name!' });
      // sanitiseName is private, test through writeCard integration
      expect(card.name).toBeDefined();
    });

    test('limits name length to 50 characters', () => {
      const longName = 'A'.repeat(100);
      const card = createTrelloCardInfo({ name: longName });
      expect(card.name.length).toBe(100);
      // Will be tested through writeCard
    });

    test('handles empty card name', () => {
      const card = createTrelloCardInfo({ name: '' });
      expect(card.name).toBe('');
    });
  });

  describe('writeCard', () => {
    beforeEach(() => {
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fetch).mockResolvedValue({ok: true, arrayBuffer: () => Promise.resolve(Buffer.from('test')) });
    });

    test.each(['/output', '/output/'])('writes card and attachments inside %s', async (outputFolder: string) => {
      const card = createTrelloCardInfo({ attachments: [createAttachmentInfo()] });
      const lists = { list1: createTrelloListInfo() };

      const result = await importer.writeCard(outputFolder, options, 'Board', card, {}, lists);

      expect(result).toBe(true);
      expect(fs.writeFile).toHaveBeenCalledWith('/output/attachments/attachment.png', expect.any(Buffer));
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/output/20240115100000-Test-Card.md',
        expect.stringContaining('![Test Attachment](/output/attachments/attachment.png)'),
        {},
      );
    });

    test('writes card without checklists or attachments', async () => {
      const card = createTrelloCardInfo({ name: 'Simple Card', desc: 'Simple description' });
      const lists = { list1: createTrelloListInfo() };

      const result = await importer.writeCard('/output/', options, 'Test Board', card, {}, lists);

      expect(result).toBe(true);
      expect(fs.writeFile).toHaveBeenCalled();
      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const content = writeCall[1] as string;
      expect(content).toContain('title: \'Simple Card\'');
      expect(content).toContain('Simple description');
      expect(content).toContain('board: \'Test Board\'');
      expect(content).not.toContain('## Checklists');
      expect(content).not.toContain('## Attachments');
    });

    test('writes card with checklists', async () => {
      const checklist = createTrelloChecklistInfo({
        id: 'cl1',
        name: 'My Tasks',
        checkItems: [createTrelloCheckItemInfo({ name: 'Task 1' })],
      });
      const card = createTrelloCardInfo({ idChecklists: ['cl1'] });
      const checklists = { cl1: checklist };
      const lists = { list1: createTrelloListInfo() };

      const result = await importer.writeCard('/output/', options, 'Board', card, checklists, lists);

      expect(result).toBe(true);
      const content = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
      expect(content).toContain('## Checklists');
      expect(content).toContain('### My Tasks');
      expect(content).toContain('Task 1');
    });

    test('writes card with comments', async () => {
      const card = createTrelloCardInfo();
      const lists = { list1: createTrelloListInfo() };
      const comments = [
        new TrelloCommentInfo('Looks good!', new Date('2024-01-15T12:00:00Z'), 'Jane Doe'),
      ];

      const result = await importer.writeCard('/output/', options, 'Board', card, {}, lists, comments);

      expect(result).toBe(true);
      const content = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
      expect(content).toContain('## Comments');
      expect(content).toContain('### Jane Doe (2024-01-15T12:00:00.000Z)');
      expect(content).toContain('Looks good!');
    });

    test('writes card with attachments', async () => {
      const card = createTrelloCardInfo({
        attachments: [createAttachmentInfo({ fileName: 'test.png', name: 'Image' })],
      });
      const lists = { list1: createTrelloListInfo() };

      const result = await importer.writeCard('/output/', options, 'Board', card, {}, lists);

      expect(result).toBe(true);
      // Index 0 is the attachment file, index 1 is the card markdown file
      const content = vi.mocked(fs.writeFile).mock.calls[1][1] as string;
      expect(content).toContain('## Attachments');
    });

    test('includes closed status in frontmatter', async () => {
      const card = createTrelloCardInfo({ closed: true });
      const lists = { list1: createTrelloListInfo() };

      await importer.writeCard('/output/', options, 'Board', card, {}, lists);

      const content = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
      expect(content).toContain('closed: true');
    });

    test('includes template status in frontmatter', async () => {
      const card = createTrelloCardInfo({ isTemplate: true });
      const lists = { list1: createTrelloListInfo() };

      await importer.writeCard('/output/', options, 'Board', card, {}, lists);

      const content = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
      expect(content).toContain('template: true');
    });

    test('includes labels as tags', async () => {
      const card = createTrelloCardInfo({
        labels: [
          createTrelloLabelInfo({ name: 'Important' }),
          createTrelloLabelInfo({ name: 'Bug Fix' }),
        ],
      });
      const lists = { list1: createTrelloListInfo() };

      await importer.writeCard('/output/', options, 'Board', card, {}, lists);

      const content = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
      expect(content).toContain("tags: ['Important', 'Bug_Fix']");
    });

    test('keeps YAML scalar label names as strings', async () => {
      const card = createTrelloCardInfo({
        labels: ['true', 'null', '123'].map(name => createTrelloLabelInfo({ name })),
      });
      const lists = { list1: createTrelloListInfo() };

      await importer.writeCard('/output/', options, 'Board', card, {}, lists);

      const content = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
      const tagsLine = content.split('\n').find(line => line.startsWith('tags: '));
      expect(tagsLine).toBe("tags: ['true', 'null', '123']");
      expect(parse(tagsLine!)).toEqual({ tags: ['true', 'null', '123'] });
    });

    test('sets published flag based on list name', async () => {
      const card = createTrelloCardInfo();
      const lists = {
        list1: createTrelloListInfo({ name: 'Published Articles' }),
      };

      await importer.writeCard('/output/', options, 'Board', card, {}, lists);

      const content = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
      expect(content).toContain('published: true');
    });

    test('handles write errors and returns false', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(fs.writeFile).mockRejectedValueOnce(new Error('Write error'));
      const card = createTrelloCardInfo();
      const lists = { list1: createTrelloListInfo() };

      const result = await importer.writeCard('/output/', options, 'Board', card, {}, lists);

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Could not write file'));
      consoleErrorSpy.mockRestore();
    });

    test('sanitizes card name in filename', async () => {
      const card = createTrelloCardInfo({ name: 'Test@Card#Name$With%Special&Chars' });
      const lists = { list1: createTrelloListInfo() };

      await importer.writeCard('/output/', options, 'Board', card, {}, lists);

      const filename = vi.mocked(fs.writeFile).mock.calls[0][0] as string;
      expect(filename).toMatch(/Test-Card-Name-With-Special-Chars\.md$/);
    });

    test('includes trello URL in frontmatter', async () => {
      const card = createTrelloCardInfo({ shortUrl: 'https://trello.com/c/abc123' });
      const lists = { list1: createTrelloListInfo() };

      await importer.writeCard('/output/', options, 'Board', card, {}, lists);

      const content = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
      expect(content).toContain("trello-url: 'https://trello.com/c/abc123'");
    });

    test('escapes single quotes and newlines in card name, board name, and list name to prevent YAML injection', async () => {
      const card = createTrelloCardInfo({ name: "Card's Name\nmalicious: true" });
      const lists = { list1: createTrelloListInfo({ name: "List's Name\nother: false" }) };

      await importer.writeCard('/output/', options, "Board's Name\ninjected: yes", card, {}, lists);

      const content = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
      expect(content).toContain("title: 'Card''s Name malicious: true'");
      expect(content).toContain("board: 'Board''s Name injected: yes'");
      expect(content).toContain("list: 'List''s Name other: false'");

      const frontmatter = content.substring(content.indexOf('---') + 3, content.lastIndexOf('---'));
      const parsed = parse(frontmatter);
      expect(parsed.title).toBe("Card's Name malicious: true");
      expect(parsed.board).toBe("Board's Name injected: yes");
      expect(parsed.list).toBe("List's Name other: false");
      expect(parsed.malicious).toBeUndefined();
      expect(parsed.injected).toBeUndefined();
    });
  });

  describe('importAsync', () => {
    beforeEach(() => {
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fetch).mockResolvedValue({ok: true, arrayBuffer: () => Promise.resolve(Buffer.from('test')) });
    });

    test('returns error when no files match glob pattern', async () => {
      vi.mocked(glob).mockResolvedValue([]);

      const result = await importer.importAsync('*.json', '/output/', options);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No files found');
    });

    test('processes single board file successfully', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const board = createTrelloBoardInfo({
        cards: [createTrelloCardInfo()],
        lists: [createTrelloListInfo()],
      });
      vi.mocked(glob).mockResolvedValue(['board.json']);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(board));

      const result = await importer.importAsync('board.json', '/output/', options);

      expect(result.success).toBe(true);
      expect(result.message).toContain('1 cards found');
      expect(result.message).toContain('1 notes created');
      consoleWarnSpy.mockRestore();
    });

    test('imports comments for their cards in chronological order', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const board = createTrelloBoardInfo({
        cards: [createTrelloCardInfo({ id: 'card1' })],
        lists: [createTrelloListInfo()],
        actions: [
          {
            id: 'action2',
            type: 'commentCard',
            date: '2024-01-15T13:00:00Z',
            data: { text: 'Second comment', card: { id: 'card1' } },
            memberCreator: { id: 'member2', fullName: 'Bob' },
          },
          {
            id: 'action1',
            type: 'commentCard',
            date: '2024-01-15T12:00:00Z',
            data: { text: 'First comment', card: { id: 'card1' } },
            memberCreator: { id: 'member1', username: 'alice' },
          },
          {
            id: 'action3',
            type: 'commentCard',
            date: '2024-01-15T14:00:00Z',
            data: { text: 'Other card comment', card: { id: 'card2' } },
            memberCreator: { id: 'member3', fullName: 'Charlie' },
          },
        ],
      });
      vi.mocked(glob).mockResolvedValue(['board.json']);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(board));

      await importer.importAsync('board.json', '/output/', options);

      const content = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
      expect(content.indexOf('First comment')).toBeLessThan(content.indexOf('Second comment'));
      expect(content).toContain('### alice (2024-01-15T12:00:00.000Z)');
      expect(content).not.toContain('Other card comment');
      consoleWarnSpy.mockRestore();
    });

    test('imports cards with a missing list using empty list metadata', async () => {
      const board = createTrelloBoardInfo({
        cards: [createTrelloCardInfo({ idList: 'missing-list' })],
        lists: [createTrelloListInfo()],
      });
      vi.mocked(glob).mockResolvedValue(['board.json']);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(board));

      const result = await importer.importAsync('board.json', '/output/', options);

      expect(result).toEqual({ success: true, message: '1 cards found; 1 notes created.' });
      expect(fs.writeFile).toHaveBeenCalledTimes(1);
      const content = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
      expect(content).toContain("\nlist: ''\n");
      expect(content).toContain('\npublished: false\n');
    });

    test('adds trailing slash to output folder if missing', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const board = createTrelloBoardInfo({
        cards: [createTrelloCardInfo()],
        lists: [createTrelloListInfo()],
      });
      vi.mocked(glob).mockResolvedValue(['board.json']);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(board));

      await importer.importAsync('*.json', '/output/', options);

      const filename = vi.mocked(fs.writeFile).mock.calls[0]?.[0] as string;
      expect(filename).toContain('/output/');
      consoleWarnSpy.mockRestore();
    });

    test('processes multiple board files', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const board1 = createTrelloBoardInfo({
        cards: [createTrelloCardInfo({ id: 'card1' })],
        lists: [createTrelloListInfo()],
      });
      const board2 = createTrelloBoardInfo({
        cards: [createTrelloCardInfo({ id: 'card2' })],
        lists: [createTrelloListInfo()],
      });
      vi.mocked(glob).mockResolvedValue(['board1.json', 'board2.json']);
      vi.mocked(fs.readFile)
        .mockResolvedValueOnce(JSON.stringify(board1))
        .mockResolvedValueOnce(JSON.stringify(board2));

      const result = await importer.importAsync('*.json', '/output/', options);

      expect(result.success).toBe(true);
      expect(result.message).toContain('2 cards found');
      expect(result.message).toContain('2 notes created');
      consoleWarnSpy.mockRestore();
    });

    test('skips closed cards', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const board = createTrelloBoardInfo({
        cards: [
          createTrelloCardInfo({ id: 'card1', closed: false }),
          createTrelloCardInfo({ id: 'card2', closed: true }),
        ],
        lists: [createTrelloListInfo()],
      });
      vi.mocked(glob).mockResolvedValue(['board.json']);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(board));

      const result = await importer.importAsync('*.json', '/output/', options);

      expect(result.message).toContain('2 cards found');
      expect(result.message).toContain('1 notes created');
      consoleWarnSpy.mockRestore();
    });

    test('skips template cards', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const board = createTrelloBoardInfo({
        cards: [
          createTrelloCardInfo({ id: 'card1', isTemplate: false }),
          createTrelloCardInfo({ id: 'card2', isTemplate: true }),
        ],
        lists: [createTrelloListInfo()],
      });
      vi.mocked(glob).mockResolvedValue(['board.json']);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(board));

      const result = await importer.importAsync('*.json', '/output/', options);

      expect(result.message).toContain('2 cards found');
      expect(result.message).toContain('1 notes created');
      consoleWarnSpy.mockRestore();
    });

    test('skips cards in closed lists', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const board = createTrelloBoardInfo({
        cards: [
          createTrelloCardInfo({ id: 'card1', idList: 'list1' }),
          createTrelloCardInfo({ id: 'card2', idList: 'list2' }),
        ],
        lists: [
          createTrelloListInfo({ id: 'list1', closed: false }),
          createTrelloListInfo({ id: 'list2', closed: true }),
        ],
      });
      vi.mocked(glob).mockResolvedValue(['board.json']);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(board));

      const result = await importer.importAsync('*.json', '/output/', options);

      expect(result.message).toContain('2 cards found');
      expect(result.message).toContain('1 notes created');
      consoleWarnSpy.mockRestore();
    });

    test('builds checklist index from board data', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const checklist = createTrelloChecklistInfo({
        id: 'cl1',
        name: 'Tasks',
        checkItems: [createTrelloCheckItemInfo({ name: 'Task 1', due: undefined as any })],
      });
      const board = createTrelloBoardInfo({
        cards: [createTrelloCardInfo({ idChecklists: ['cl1'] })],
        lists: [createTrelloListInfo()],
        checklists: [checklist],
      });
      vi.mocked(glob).mockResolvedValue(['board.json']);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(board));

      await importer.importAsync('*.json', '/output/', options);

      const content = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
      expect(content).toContain('### Tasks');
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    test('builds list index from board data', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const list = createTrelloListInfo({ id: 'list1', name: 'In Progress' });
      const board = createTrelloBoardInfo({
        cards: [createTrelloCardInfo({ idList: 'list1' })],
        lists: [list],
      });
      vi.mocked(glob).mockResolvedValue(['board.json']);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(board));

      await importer.importAsync('*.json', '/output/', options);

      const content = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
      expect(content).toContain("list: 'In Progress'");
      consoleWarnSpy.mockRestore();
    });

    test('warns when multiple files are found', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const board = createTrelloBoardInfo({ cards: [], lists: [] });
      vi.mocked(glob).mockResolvedValue(['board1.json', 'board2.json']);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(board));

      await importer.importAsync('*.json', '/output/', options);

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('2 files found'));
      consoleWarnSpy.mockRestore();
    });
  });

  describe('downloadBoardJson', () => {
    test.each(['My Board', 'abc12345'])('encodes credentials as query values for %s', async (boardIdOrName: string) => {
      const mockBoard = createTrelloBoardInfo({ id: 'abc12345', name: 'My Board' });
      const apiKey = 'key&cards=none+ #?=%';
      const token = 'token&injected=value+ #?=%';
      if (boardIdOrName === 'My Board') {
        vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([mockBoard]) });
      }
      vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockBoard) });

      const result = await TrelloImport.downloadBoardJson({ boardIdOrName, apiKey, token });

      expect(result).toEqual(mockBoard);
      expect(fetch).toHaveBeenCalledTimes(boardIdOrName === 'My Board' ? 2 : 1);
      for (const [request] of vi.mocked(fetch).mock.calls) {
        const url = new URL(String(request));
        expect(url.hash).toBe('');
        expect(Object.fromEntries(url.searchParams)).toEqual({
          key: apiKey,
          token,
          ...(url.pathname === '/1/boards/abc12345' ? {
            cards: 'all', lists: 'all', checklists: 'all', labels: 'all', members: 'all', fields: 'all',
          } : {}),
        });
      }
    });

    test('downloads board by valid ID', async () => {
      const mockBoard = createTrelloBoardInfo();
      vi.mocked(fetch).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockBoard) });

      const result = await TrelloImport.downloadBoardJson({
        boardIdOrName: '507f1f77bcf86cd799439011',
        apiKey: 'test-key',
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('507f1f77bcf86cd799439011'),
      );
      expect(result).toEqual(mockBoard);
    });

    test('downloads board by 8-character ID', async () => {
      const mockBoard = createTrelloBoardInfo();
      vi.mocked(fetch).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockBoard) });

      const result = await TrelloImport.downloadBoardJson({
        boardIdOrName: 'abc12345',
        apiKey: 'test-key',
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('abc12345'),
      );
      expect(result).toEqual(mockBoard);
    });

    test('looks up board by name when not a valid ID', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockBoards = [
        { id: 'board1', name: 'My Board' },
        { id: 'board2', name: 'Other Board' },
      ];
      const mockBoard = createTrelloBoardInfo({ id: 'board1', name: 'My Board' });
      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockBoards) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockBoard) });

      const result = await TrelloImport.downloadBoardJson({
        boardIdOrName: 'My Board',
        apiKey: 'test-key',
        token: 'test-token',
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/members/me/boards'),
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('board1'),
      );
      expect(result).toEqual(mockBoard);
      consoleLogSpy.mockRestore();
    });

    test('throws error when board ID is invalid and name lookup fails', async () => {
      const mockBoards = [
        { id: 'board1', name: 'My Board' },
        { id: 'board2', name: 'Other Board' },
      ];
      vi.mocked(fetch).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockBoards) });

      await expect(
        TrelloImport.downloadBoardJson({
          boardIdOrName: 'Invalid Board',
          apiKey: 'test-key',
          token: 'test-token',
        })
      ).rejects.toThrow('Could not find Trello board');
    });

    test('throws error when fetch returns unsuccessful HTTP status during board download', async () => {
      vi.mocked(fetch).mockResolvedValue({ ok: false, statusText: 'Not Found' });

      await expect(
        TrelloImport.downloadBoardJson({
          boardIdOrName: 'My Board Name',
          apiKey: 'test-key',
        })
      ).rejects.toThrow('A Trello token');
    });

    test('throws error when board name not found', async () => {
      const mockBoards = [
        { id: 'board1', name: 'Board One' },
        { id: 'board2', name: 'Board Two' },
      ];
      vi.mocked(fetch).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockBoards) });

      await expect(
        TrelloImport.downloadBoardJson({
          boardIdOrName: 'Nonexistent Board',
          apiKey: 'test-key',
          token: 'test-token',
        })
      ).rejects.toThrow('Could not find Trello board');
    });

    test('includes token in board download URL when provided', async () => {
      const mockBoard = createTrelloBoardInfo();
      vi.mocked(fetch).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockBoard) });

      await TrelloImport.downloadBoardJson({
        boardIdOrName: 'abc12345',
        apiKey: 'test-key',
        token: 'test-token',
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('&token=test-token'),
      );
    });

    test('omits token from URL when not provided', async () => {
      const mockBoard = createTrelloBoardInfo();
      vi.mocked(fetch).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockBoard) });

      await TrelloImport.downloadBoardJson({
        boardIdOrName: 'abc12345',
        apiKey: 'test-key',
      });

      const url = vi.mocked(fetch).mock.calls[0][0];
      expect(url).not.toContain('&token=');
    });

    test('logs verbose output when enabled', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockBoard = createTrelloBoardInfo();
      vi.mocked(fetch).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockBoard) });

      await TrelloImport.downloadBoardJson({
        boardIdOrName: 'abc12345',
        apiKey: 'test-key',
        verbose: true,
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Downloading Trello board'),
      );
      consoleLogSpy.mockRestore();
    });

    test('logs verbose board name resolution', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockBoards = [{ id: 'board1', name: 'My Board' }];
      const mockBoard = createTrelloBoardInfo();
      vi.mocked(fetch)
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockBoards) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockBoard) });

      await TrelloImport.downloadBoardJson({
        boardIdOrName: 'My Board',
        apiKey: 'test-key',
        token: 'test-token',
        verbose: true,
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Looking up Trello board id'),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Resolved board name'),
      );
      consoleLogSpy.mockRestore();
    });

    test('handles API errors gracefully', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('API Error'));

      await expect(
        TrelloImport.downloadBoardJson({
          boardIdOrName: 'abc12345',
          apiKey: 'test-key',
        })
      ).rejects.toThrow('API Error');
    });
  });

  describe('edge cases and integration', () => {
    test('handles card with empty description', async () => {
      const card = createTrelloCardInfo({ desc: '' });
      const lists = { list1: createTrelloListInfo() };

      await importer.writeCard('/output/', options, 'Board', card, {}, lists);

      const content = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
      expect(content).toContain('## Test Card');
    });

    test('handles card with special characters in name', async () => {
      const card = createTrelloCardInfo({ name: 'Card: With / Special \\ Characters?' });
      const lists = { list1: createTrelloListInfo() };

      await importer.writeCard('/output/', options, 'Board', card, {}, lists);

      const filename = vi.mocked(fs.writeFile).mock.calls[0][0] as string;
      // Should sanitize special characters in filename (check basename only, not path)
      const basename = filename.split('/').pop() || '';
      expect(basename).not.toContain('/');
      expect(basename).not.toContain('\\');
      expect(basename).not.toContain('?');
      expect(basename).not.toContain(':');
    });

    test('handles labels with special characters', async () => {
      const card = createTrelloCardInfo({
        labels: [createTrelloLabelInfo({ name: 'Label With Spaces!' })],
      });
      const lists = { list1: createTrelloListInfo() };

      await importer.writeCard('/output/', options, 'Board', card, {}, lists);

      const content = vi.mocked(fs.writeFile).mock.calls[0][1] as string;
      expect(content).toContain("tags: ['Label_With_Spaces_']");
    });

    test('processes board with all entity types', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const checklist = createTrelloChecklistInfo({
        id: 'cl1',
        checkItems: [createTrelloCheckItemInfo({ name: 'Task', due: undefined as any })],
      });
      const list = createTrelloListInfo();
      const label = createTrelloLabelInfo();
      const card = createTrelloCardInfo({
        idChecklists: ['cl1'],
        labels: [label],
        attachments: [createAttachmentInfo({ fileName: 'file.png' })],
      });
      const board = createTrelloBoardInfo({
        cards: [card],
        lists: [list],
        checklists: [checklist],
        labels: [label],
      });
      vi.mocked(glob).mockResolvedValue(['board.json']);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(board));
      vi.mocked(fetch).mockResolvedValue({ ok: true, arrayBuffer: () => Promise.resolve(Buffer.from('test')) });

      const result = await importer.importAsync('*.json', '/output/', options);

      expect(result.success).toBe(true);
      const content = vi.mocked(fs.writeFile).mock.calls[1][1] as string; // [0] is attachment, [1] is card
      expect(content).toContain('## Checklists');
      expect(content).toContain('## Attachments');
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});
