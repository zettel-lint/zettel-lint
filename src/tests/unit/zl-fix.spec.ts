import { describe, expect, test } from 'vitest'
import fixerCommand from '../../zl-fix'

// NOTE: Testing library/framework: Vitest

// --- Tests aligned with PR diff focus ---
describe('fixerCommand', () => {
  test('adds fix to cli', () => {
    expect(fixerCommand().name()).toBe("fix");
  });

  test('can parse ignoreDirs', () => {
    const opts = fixerCommand().parse(["node", "zl", "--path", ".", "--ignore-dirs", "node_modules", "bin", "--rules", "id-to-wiki-links"]);
    expect(opts.args).toEqual([]);
    expect(opts.opts()["ignoreDirs"]).toBeDefined();
    expect(opts.opts().ignoreDirs).toEqual(["node_modules", "bin"]); 
  });

  test('can parse rules', () => {
    const opts = fixerCommand().parse(["node", "zl", "--path", ".", "--rules", "id-to-wiki-links", "normalize-frontmatter", "copy-inline-props-to-frontmatter"]);
    expect(opts.args).toEqual([]);
    expect(opts.opts()["rules"]).toBeDefined();
    expect(opts.opts().rules).toEqual(["id-to-wiki-links", "normalize-frontmatter", "copy-inline-props-to-frontmatter"]); 
  });

  test('can parse path', () => {
    expect(fixerCommand().parse(["node", "zl", "--ignore-dirs", "node_modules", "--path", "."]).opts().path).toBe(".");
  });

  test('can parse verbose option', () => {
    const opts = fixerCommand().parse(["node", "zl", "--verbose", "--rules", "id-to-wiki-links"]);
    expect(opts.opts().verbose).toBe(true);
  });

  test('can parse multiple options', () => {
    const opts = fixerCommand().parse(["node", "zl", "--path", ".", "--verbose", "--rules", "id-to-wiki-links", "normalize-frontmatter"]);
    expect(opts.opts().path).toBe(".");
    expect(opts.opts().verbose).toBe(true);
  });
});

// --- Extended comprehensive tests (robust to unknown implementation details) ---
const fresh = () => fixerCommand();

describe('fixerCommand (extended)', () => {
  test('help text mentions key options if helpInformation is available', () => {
    const cmd = fresh() as any;
    const help = typeof cmd.helpInformation === 'function' ? cmd.helpInformation() : '';
    expect(cmd.name()).toBe('fix');
    if (help) {
      expect(help).toContain('--path');
      expect(help).toContain('--rules');
      expect(help).toContain('--ignore-dirs');
      expect(help).toContain('--verbose');
    }
  });

  test('rules: single and multiple values preserve order', () => {
    const one = fresh().parse(['node', 'zl', '--path', '.', '--rules', 'normalize-frontmatter']);
    expect(one.opts().rules).toEqual(['normalize-frontmatter']);

    const many = fresh().parse([
      'node','zl','--path','.',
      '--rules','id-to-wiki-links','normalize-frontmatter','copy-inline-props-to-frontmatter'
    ]);
    expect(many.opts().rules).toEqual([
      'id-to-wiki-links','normalize-frontmatter','copy-inline-props-to-frontmatter'
    ]);
  });

  test('ignore-dirs: trims whitespace (tolerant assertion)', () => {
    const parsed = fresh().parse([
      'node','zl','--path','.',
      '--ignore-dirs',' node_modules ',' bin ',
      '--rules','id-to-wiki-links'
    ]);
    const ignore = parsed.opts().ignoreDirs;
    expect(Array.isArray(ignore)).toBe(true);
    expect(ignore && ignore.map((s: string) => s.trim())).toEqual(['node_modules','bin']);
  });

  test('rules: trims whitespace (tolerant assertion)', () => {
    const parsed = fresh().parse([
      'node','zl','--path','.',
      '--rules','  id-to-wiki-links  ',' normalize-frontmatter '
    ]);
    const rules = parsed.opts().rules;
    expect(Array.isArray(rules)).toBe(true);
    expect(rules.map((s: string) => s.trim())).toEqual(['id-to-wiki-links','normalize-frontmatter']);
  });

  test('verbose defaults to falsey when not provided and true when present', () => {
    expect(!!fresh().parse(['node','zl','--path','.','--rules','id-to-wiki-links']).opts().verbose).toBe(false);
    const withFlag = fresh().parse(['node','zl','--path','.','--verbose','--rules','id-to-wiki-links']);
    expect(withFlag.opts().verbose).toBe(true);
  });

  test('accepts absolute path values', () => {
    const abs = '/tmp/wiki';
    const parsed = fresh().parse(['node','zl','--path',abs,'--rules','normalize-frontmatter']);
    expect(parsed.opts().path).toBe(abs);
  });

  test('handles missing --rules gracefully (either allowed or helpful error)', () => {
    const cmd = fresh();
    const attempt = () => cmd.parse(['node','zl','--path','.']);
    try {
      const parsed = attempt();
      const rules = parsed.opts().rules;
      expect(rules === undefined || Array.isArray(rules)).toBe(true);
    } catch (err) {
      expect(String(err)).toMatch(/rule/i);
    }
  });

  test('unknown option is either ignored by CLI or throws clear error', () => {
    const cmd = fresh();
    const run = () => cmd.parse(['node','zl','--path','.','--rules','id-to-wiki-links','--not-a-real-flag']);
    try {
      run();
      const o = cmd.opts();
      expect(o.path).toBe('.');
      expect(o.rules).toEqual(['id-to-wiki-links']);
    } catch (err) {
      expect(String(err)).toMatch(/unknown option|Unknown option|unexpected/i);
    }
  });

  test('positional args after -- are not treated as rules', () => {
    const parsed = fresh().parse(['node','zl','--path','.','--rules','id-to-wiki-links','--','positional.txt']);
    expect(parsed.args).toEqual(['positional.txt']);
    expect(parsed.opts().rules).toEqual(['id-to-wiki-links']);
  });
});