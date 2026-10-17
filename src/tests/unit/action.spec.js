import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const { getInput, setFailed, setOutput, exec } = vi.hoisted(() => ({
  getInput: vi.fn(),
  setFailed: vi.fn(),
  setOutput: vi.fn(),
  exec: vi.fn(),
}));

vi.mock('@actions/core', () => ({ getInput, setFailed, setOutput }));
vi.mock('@actions/exec', () => ({ exec }));

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  getInput.mockReturnValue('');
  exec.mockResolvedValue(0);
});

afterEach(() => vi.restoreAllMocks());

async function runAction() {
  await import('../../../action.js');
  await vi.dynamicImportSettled();
}

test.each([false, true])('invokes index with supported options (verbose=%s)', async (verbose) => {
  getInput.mockImplementation((name) => ({
    path: 'notes with spaces', verbose: String(verbose), force: 'true', format: 'json',
  })[name]);
  await runAction();
  expect(exec).toHaveBeenCalledWith('npx', [
    'zettel-lint', 'index', '--path', 'notes with spaces', ...(verbose ? ['--verbose'] : []),
  ], expect.objectContaining({ ignoreReturnCode: true }));
  expect(setOutput).not.toHaveBeenCalledWith('file', expect.anything());
});

test('defaults to the current directory', async () => {
  await runAction();
  expect(exec.mock.calls[0][1]).toEqual(['zettel-lint', 'index', '--path', '.']);
});

test('decodes interleaved stdout and stderr with independent UTF-8 state', async () => {
  exec.mockImplementation(async (_command, _args, { listeners }) => {
    const stdout = Buffer.from('😀');
    const stderr = Buffer.from('€');
    listeners.stdout(stdout.subarray(0, 2));
    listeners.stderr(stderr.subarray(0, 1));
    listeners.stdout(stdout.subarray(2));
    listeners.stderr(stderr.subarray(1));
    return 0;
  });
  await runAction();
  expect(setOutput).toHaveBeenCalledWith('summary', '😀€');
});

test.each([false, true])('flushes incomplete UTF-8 on completion (exec throws=%s)', async (throws) => {
  exec.mockImplementation(async (_command, _args, { listeners }) => {
    listeners.stdout(Buffer.from([0xe2]));
    listeners.stderr(Buffer.from([0xf0, 0x9f]));
    if (throws) throw new Error('spawn failed');
    return 0;
  });
  await runAction();
  expect(setOutput).toHaveBeenCalledWith('summary', '\ufffd\ufffd');
  expect(setOutput).toHaveBeenCalledWith('result', throws ? 'error' : 'success');
  if (throws) expect(setFailed).toHaveBeenCalledWith('Zettel lint failed with exit code 2');
});

test.each([
  [new Error('input failed'), 'input failed'],
  ['string failure', 'string failure'],
  [null, 'null'],
  [undefined, 'undefined'],
])('reports thrown input values safely: %s', async (value, message) => {
  getInput.mockImplementation(() => { throw value; });
  await runAction();
  expect(setFailed).toHaveBeenCalledWith(message);
});
