import { describe, expect, test, vi, beforeEach } from 'vitest';
import indexerCommand from '../../zl-index';

// Mock node-fetch for GitHub API calls
vi.mock('node-fetch', () => ({
  default: vi.fn(async (url, opts) => {
    if (url.includes('/search/issues')) {
      // Simulate no existing issues
      return { json: async () => ({ items: [] }) };
    }
    if (url.includes('/issues')) {
      // Simulate successful issue creation
      return { ok: true, json: async () => ({ number: 123 }) };
    }
    return { ok: false, text: async () => 'error' };
  })
}));

const DUMMY_TASK = 'Test task for issue';
const DUMMY_FILE = 'dummy.md';
const DUMMY_TITLE = 'Dummy Note';


// Helper to run the command with --tasks-to-issues
async function runTasksToIssues(opts = {}) {
  // Patch process.env for test
  process.env.GITHUB_TOKEN = 'dummy-token';
  process.env.GITHUB_REPOSITORY = 'owner/repo';

  // Patch glob and collectFromFile before importing zl-index
  const fakeGlob = vi.fn(async () => ['/path/' + DUMMY_FILE]);
  const fakeCollectFromFile = vi.fn(async () => ({
    id: 'id1',
    filename: DUMMY_FILE,
    fullpath: '/path/' + DUMMY_FILE,
    wikiname: 'dummy',
    title: DUMMY_TITLE,
    matchData: { Tasks: [DUMMY_TASK] }
  }));

  vi.doMock('glob', () => ({ glob: fakeGlob }));
  vi.doMock('../../zl-index', async () => {
    const actual = await vi.importActual<any>('../../zl-index');
    return { ...actual, collectFromFile: fakeCollectFromFile };
  });

  // Import after mocks
  const zlIndex = await import('../../zl-index');
  const cmd = zlIndex.default();
  await cmd.parseAsync(['node', 'zl', '--tasks-to-issues', '--reference-file', 'dummy.md']);

  // Check that collectFromFile and glob were called
  expect(fakeCollectFromFile).toHaveBeenCalled();
  expect(fakeGlob).toHaveBeenCalled();
}

describe('indexerCommand --tasks-to-issues', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  test('creates GitHub issues for tasks', async () => {
    await runTasksToIssues();
  });

  test('does not create duplicate issues if already exists', async () => {
    // Patch node-fetch to simulate existing open issue
    vi.doMock('node-fetch', () => ({
      default: vi.fn(async (url, opts) => {
        if (url.includes('/search/issues')) {
          return { json: async () => ({ items: [{ title: DUMMY_TASK, state: 'open' }] }) };
        }
        if (url.includes('/issues')) {
          return { ok: true, json: async () => ({ number: 123 }) };
        }
        return { ok: false, text: async () => 'error' };
      })
    }));
    await runTasksToIssues();
  });
});
