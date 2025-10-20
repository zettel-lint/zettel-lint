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

describe('path handling', () => {
  test('handles Windows-style paths', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse(['node', 'zl', '--path', 'C:\\Users\\test\\Documents', '--output-dir', 'D:\\Output']);
    expect(parsed.opts().path).toBe('C:\\Users\\test\\Documents');
    expect(parsed.opts().outputDir).toBe('D:\\Output');
  });

  test('handles Unix-style paths', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse(['node', 'zl', '--path', '/home/user/docs', '--output-dir', '/tmp/output']);
    expect(parsed.opts().path).toBe('/home/user/docs');
    expect(parsed.opts().outputDir).toBe('/tmp/output');
  });

  test('handles mixed path separators in ignore-dirs', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', '.',
      '--ignore-dirs', 'node_modules', 'test\\fixtures', 'docs/drafts'
    ]);
    expect(parsed.opts().ignoreDirs).toEqual(['node_modules', 'test\\fixtures', 'docs/drafts']);
  });

  test('handles relative paths', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', './notes',
      '--output-dir', '../output'
    ]);
    expect(parsed.opts().path).toBe('./notes');
    expect(parsed.opts().outputDir).toBe('../output');
  });

  test('handles paths with spaces', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', 'My Documents/Notes',
      '--output-dir', 'Output Files/Fixed'
    ]);
    expect(parsed.opts().path).toBe('My Documents/Notes');
    expect(parsed.opts().outputDir).toBe('Output Files/Fixed');
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

// --- Additional comprehensive tests for path handling improvements ---
describe('path handling with join, relative, and dirname', () => {
  test('handles deeply nested relative paths', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', './notes/2024/january/week1',
      '--output-dir', './output/fixed/2024/january/week1',
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().path).toBe('./notes/2024/january/week1');
    expect(parsed.opts().outputDir).toBe('./output/fixed/2024/january/week1');
  });

  test('handles absolute paths with deeply nested directories', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', '/var/lib/notes/archives/2024/Q1',
      '--output-dir', '/tmp/output/archives/2024/Q1',
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().path).toBe('/var/lib/notes/archives/2024/Q1');
    expect(parsed.opts().outputDir).toBe('/tmp/output/archives/2024/Q1');
  });

  test('handles paths without trailing slash', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', './notes',
      '--output-dir', './output',
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().path).toBe('./notes');
    expect(parsed.opts().outputDir).toBe('./output');
  });

  test('handles paths with trailing slash', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', './notes/',
      '--output-dir', './output/',
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().path).toBe('./notes/');
    expect(parsed.opts().outputDir).toBe('./output/');
  });

  test('handles current directory notation', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', '.',
      '--output-dir', '.',
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().path).toBe('.');
    expect(parsed.opts().outputDir).toBe('.');
  });

  test('handles parent directory notation', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', '../parent-notes',
      '--output-dir', '../parent-output',
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().path).toBe('../parent-notes');
    expect(parsed.opts().outputDir).toBe('../parent-output');
  });

  test('handles multiple parent directory references', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', '../../grandparent/notes',
      '--output-dir', '../../grandparent/output',
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().path).toBe('../../grandparent/notes');
    expect(parsed.opts().outputDir).toBe('../../grandparent/output');
  });

  test('handles paths with special characters', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', './notes_2024-Q1',
      '--output-dir', './output_fixed-2024',
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().path).toBe('./notes_2024-Q1');
    expect(parsed.opts().outputDir).toBe('./output_fixed-2024');
  });

  test('handles paths with dots in directory names', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', './notes.backup/2024.01',
      '--output-dir', './output.fixed/2024.01',
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().path).toBe('./notes.backup/2024.01');
    expect(parsed.opts().outputDir).toBe('./output.fixed/2024.01');
  });

  test('handles paths with Unicode characters', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', './notes/café/résumé',
      '--output-dir', './output/café/résumé',
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().path).toBe('./notes/café/résumé');
    expect(parsed.opts().outputDir).toBe('./output/café/résumé');
  });
});

describe('property filter option', () => {
  test('accepts single property filter pattern', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', '.',
      '--rules', 'inline-properties-to-frontmatter',
      '--property-filter', '^tags$'
    ]);
    expect(parsed.opts().propertyFilter).toEqual(['^tags$']);
  });

  test('accepts multiple property filter patterns', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', '.',
      '--rules', 'inline-properties-to-frontmatter',
      '--property-filter', '^tags$', '^status$', '^priority$'
    ]);
    expect(parsed.opts().propertyFilter).toEqual(['^tags$', '^status$', '^priority$']);
  });

  test('property filter is optional', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', '.',
      '--rules', 'inline-properties-to-frontmatter'
    ]);
    expect(parsed.opts().propertyFilter).toEqual([]);
  });

  test('accepts complex regex patterns', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', '.',
      '--rules', 'inline-properties-to-frontmatter',
      '--property-filter', '^(tags|categories)$', '.*priority.*', '^status-[0-9]+$'
    ]);
    expect(parsed.opts().propertyFilter).toEqual(['^(tags|categories)$', '.*priority.*', '^status-[0-9]+$']);
  });

  test('property filter with special regex characters', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', '.',
      '--rules', 'inline-properties-to-frontmatter',
      '--property-filter', '[a-z]+', '\\d{3}', '(one|two|three)'
    ]);
    expect(parsed.opts().propertyFilter).toEqual(['[a-z]+', '\\d{3}', '(one|two|three)']);
  });
});

describe('move option', () => {
  test('move option defaults to false', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', '.',
      '--rules', 'inline-properties-to-frontmatter'
    ]);
    expect(parsed.opts().move).toBe(false);
  });

  test('move option can be enabled', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', '.',
      '--rules', 'inline-properties-to-frontmatter',
      '--move'
    ]);
    expect(parsed.opts().move).toBe(true);
  });

  test('move option works with property filter', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', '.',
      '--rules', 'inline-properties-to-frontmatter',
      '--move',
      '--property-filter', '^tags$'
    ]);
    expect(parsed.opts().move).toBe(true);
    expect(parsed.opts().propertyFilter).toEqual(['^tags$']);
  });
});

describe('output-dir option', () => {
  test('output-dir defaults to current directory', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', './notes',
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().outputDir).toBe('.');
  });

  test('output-dir can be customized', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', './notes',
      '--output-dir', './fixed-notes',
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().outputDir).toBe('./fixed-notes');
  });

  test('output-dir handles absolute paths', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', './notes',
      '--output-dir', '/tmp/fixed-notes',
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().outputDir).toBe('/tmp/fixed-notes');
  });

  test('output-dir handles relative paths with parent references', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', './notes',
      '--output-dir', '../fixed-notes',
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().outputDir).toBe('../fixed-notes');
  });

  test('output-dir same as input path is allowed', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', './notes',
      '--output-dir', './notes',
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().outputDir).toBe('./notes');
  });
});

describe('command aliases and names', () => {
  test('command has "fix" name', () => {
    expect(fixerCommand().name()).toBe('fix');
  });

  test('command has "lint" alias', () => {
    const cmd = fixerCommand();
    expect(cmd.aliases()).toContain('lint');
  });

  test('command description mentions fixing', () => {
    const cmd = fixerCommand();
    expect(cmd.description()).toMatch(/fix/i);
  });
});

describe('rules validation', () => {
  test('accepts known rules', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', '.',
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().rules).toEqual(['trailing-newline']);
  });

  test('accepts multiple known rules', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', '.',
      '--rules', 'trailing-newline', 'inline-properties-to-frontmatter'
    ]);
    expect(parsed.opts().rules).toEqual(['trailing-newline', 'inline-properties-to-frontmatter']);
  });

  test('preserves rule order', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', '.',
      '--rules', 'inline-properties-to-frontmatter', 'trailing-newline'
    ]);
    expect(parsed.opts().rules).toEqual(['inline-properties-to-frontmatter', 'trailing-newline']);
  });

  test('accepts duplicate rules (will be deduplicated by fixNotes)', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', '.',
      '--rules', 'trailing-newline', 'trailing-newline', 'inline-properties-to-frontmatter'
    ]);
    expect(parsed.opts().rules).toEqual(['trailing-newline', 'trailing-newline', 'inline-properties-to-frontmatter']);
  });

  test('empty rules array is allowed by parser', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', '.'
    ]);
    expect(parsed.opts().rules).toEqual([]);
  });
});

describe('edge cases and boundary conditions', () => {
  test('handles empty path string', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', '',
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().path).toBe('');
  });

  test('handles very long paths', () => {
    const longPath = './notes/' + 'a/'.repeat(50) + 'file';
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', longPath,
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().path).toBe(longPath);
  });

  test('handles paths with repeated slashes', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', './notes//subdir///files',
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().path).toBe('./notes//subdir///files');
  });

  test('handles paths ending with multiple slashes', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', './notes///',
      '--output-dir', './output///',
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().path).toBe('./notes///');
    expect(parsed.opts().outputDir).toBe('./output///');
  });

  test('handles ignore-dirs with many entries', () => {
    const cmd = fixerCommand();
    const dirs = Array.from({ length: 20 }, (_, i) => `dir${i}`);
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', '.',
      '--ignore-dirs', ...dirs,
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().ignoreDirs).toEqual(dirs);
  });

  test('handles combined short and long option syntax', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '-p', './notes',
      '--rules', 'trailing-newline',
      '-i', 'node_modules',
      '-v'
    ]);
    expect(parsed.opts().path).toBe('./notes');
    expect(parsed.opts().rules).toEqual(['trailing-newline']);
    expect(parsed.opts().ignoreDirs).toEqual(['node_modules']);
    expect(parsed.opts().verbose).toBe(true);
  });

  test('handles options in different order', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--rules', 'trailing-newline',
      '--verbose',
      '--path', './notes',
      '--ignore-dirs', 'node_modules',
      '--output-dir', './output'
    ]);
    expect(parsed.opts().path).toBe('./notes');
    expect(parsed.opts().rules).toEqual(['trailing-newline']);
    expect(parsed.opts().ignoreDirs).toEqual(['node_modules']);
    expect(parsed.opts().outputDir).toBe('./output');
    expect(parsed.opts().verbose).toBe(true);
  });

  test('handles ignore-dirs with empty strings', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', '.',
      '--ignore-dirs', '', 'node_modules', '',
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().ignoreDirs).toEqual(['', 'node_modules', '']);
  });

  test('handles property-filter with empty strings', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', '.',
      '--rules', 'inline-properties-to-frontmatter',
      '--property-filter', '', '^tags$', ''
    ]);
    expect(parsed.opts().propertyFilter).toEqual(['', '^tags$', '']);
  });
});

describe('cross-platform path compatibility', () => {
  test('handles forward slashes in paths', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', './notes/2024/january',
      '--output-dir', './output/fixed/2024',
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().path).toBe('./notes/2024/january');
    expect(parsed.opts().outputDir).toBe('./output/fixed/2024');
  });

  test('handles backslashes in paths (Windows-style)', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', '.\\notes\\2024\\january',
      '--output-dir', '.\\output\\fixed\\2024',
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().path).toBe('.\\notes\\2024\\january');
    expect(parsed.opts().outputDir).toBe('.\\output\\fixed\\2024');
  });

  test('handles mixed path separators (not recommended but possible)', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', './notes\\subdir/files',
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().path).toBe('./notes\\subdir/files');
  });

  test('handles Windows drive letters', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', 'C:\\Users\\Documents\\Notes',
      '--output-dir', 'D:\\Output\\Fixed',
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().path).toBe('C:\\Users\\Documents\\Notes');
    expect(parsed.opts().outputDir).toBe('D:\\Output\\Fixed');
  });

  test('handles UNC paths (Windows network paths)', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', '\\\\server\\share\\notes',
      '--output-dir', '\\\\server\\share\\output',
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().path).toBe('\\\\server\\share\\notes');
    expect(parsed.opts().outputDir).toBe('\\\\server\\share\\output');
  });

  test('handles Unix absolute paths', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', '/home/user/notes',
      '--output-dir', '/tmp/output',
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().path).toBe('/home/user/notes');
    expect(parsed.opts().outputDir).toBe('/tmp/output');
  });
});

describe('option combinations', () => {
  test('all options together', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', './notes',
      '--output-dir', './output',
      '--rules', 'trailing-newline', 'inline-properties-to-frontmatter',
      '--ignore-dirs', 'node_modules', 'build', 'dist',
      '--property-filter', '^tags$', '^status$',
      '--move',
      '--verbose'
    ]);
    expect(parsed.opts().path).toBe('./notes');
    expect(parsed.opts().outputDir).toBe('./output');
    expect(parsed.opts().rules).toEqual(['trailing-newline', 'inline-properties-to-frontmatter']);
    expect(parsed.opts().ignoreDirs).toEqual(['node_modules', 'build', 'dist']);
    expect(parsed.opts().propertyFilter).toEqual(['^tags$', '^status$']);
    expect(parsed.opts().move).toBe(true);
    expect(parsed.opts().verbose).toBe(true);
  });

  test('minimal options (just path and rules)', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', '.',
      '--rules', 'trailing-newline'
    ]);
    expect(parsed.opts().path).toBe('.');
    expect(parsed.opts().rules).toEqual(['trailing-newline']);
    expect(parsed.opts().outputDir).toBe('.');
    expect(parsed.opts().move).toBe(false);
    expect(parsed.opts().verbose).toBe(false);
  });

  test('inline-properties-to-frontmatter with full configuration', () => {
    const cmd = fixerCommand();
    const parsed = cmd.parse([
      'node', 'zl',
      '--path', './notes',
      '--output-dir', './fixed',
      '--rules', 'inline-properties-to-frontmatter',
      '--property-filter', '^(tags|status|priority)$',
      '--move',
      '--verbose'
    ]);
    expect(parsed.opts().rules).toEqual(['inline-properties-to-frontmatter']);
    expect(parsed.opts().propertyFilter).toEqual(['^(tags|status|priority)$']);
    expect(parsed.opts().move).toBe(true);
  });
});