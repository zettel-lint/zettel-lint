import { describe, expect, test, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('package.json', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pkg: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lockfile: any;

  beforeAll(() => {
    const pkgPath = resolve(__dirname, '../../../package.json');
    pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

    const lockPath = resolve(__dirname, '../../../package-lock.json');
    lockfile = JSON.parse(readFileSync(lockPath, 'utf-8'));
  });

  describe('lint script', () => {
    test('runs eslint against the src directory', () => {
      expect(pkg.scripts.lint).toBe('eslint src/');
    });

    test('no longer relies on tsc --noEmit for linting', () => {
      expect(pkg.scripts.lint).not.toContain('tsc');
    });
  });

  describe('eslint-related devDependencies', () => {
    test('declares @eslint/js with a valid semver range', () => {
      expect(pkg.devDependencies).toHaveProperty('@eslint/js');
      expect(pkg.devDependencies['@eslint/js']).toMatch(/^\^?\d+\.\d+\.\d+$/);
    });

    test('declares typescript-eslint with a valid semver range', () => {
      expect(pkg.devDependencies).toHaveProperty('typescript-eslint');
      expect(pkg.devDependencies['typescript-eslint']).toMatch(/^\^?\d+\.\d+\.\d+$/);
    });

    test('retains the core eslint package', () => {
      expect(pkg.devDependencies).toHaveProperty('eslint');
    });

    test('retains typescript, required as a peer dependency of typescript-eslint', () => {
      expect(pkg.devDependencies).toHaveProperty('typescript');
    });
  });

  describe('other scripts remain unchanged', () => {
    test('build script still compiles with tsc', () => {
      expect(pkg.scripts.build).toBe('tsc -p .');
    });

    test('test script still runs vitest in non-watch mode', () => {
      expect(pkg.scripts.test).toBe('vitest --run');
    });

    test('create script still runs build then test', () => {
      expect(pkg.scripts.create).toBe('npm run build && npm run test');
    });
  });

  describe('package-lock.json consistency', () => {
    test('lockfile name and version match package.json', () => {
      expect(lockfile.name).toBe(pkg.name);
      expect(lockfile.version).toBe(pkg.version);
    });

    test('root package entry devDependencies match package.json for new eslint tooling', () => {
      const rootEntry = lockfile.packages[''];
      expect(rootEntry.devDependencies['@eslint/js']).toBe(pkg.devDependencies['@eslint/js']);
      expect(rootEntry.devDependencies['typescript-eslint']).toBe(
        pkg.devDependencies['typescript-eslint']
      );
    });

    test('includes resolved package entries for the new eslint tooling', () => {
      expect(lockfile.packages).toHaveProperty('node_modules/@eslint/js');
      expect(lockfile.packages).toHaveProperty('node_modules/typescript-eslint');
    });

    test('resolved @eslint/js version satisfies the package.json range', () => {
      const range = pkg.devDependencies['@eslint/js'];
      const majorFromRange = range.replace('^', '').split('.')[0];
      const resolvedVersion = lockfile.packages['node_modules/@eslint/js'].version;
      expect(resolvedVersion.split('.')[0]).toBe(majorFromRange);
    });

    test('resolved typescript-eslint version satisfies the package.json range', () => {
      const range = pkg.devDependencies['typescript-eslint'];
      const majorFromRange = range.replace('^', '').split('.')[0];
      const resolvedVersion = lockfile.packages['node_modules/typescript-eslint'].version;
      expect(resolvedVersion.split('.')[0]).toBe(majorFromRange);
    });

    test('new eslint tooling is marked as a dev dependency', () => {
      expect(lockfile.packages['node_modules/@eslint/js'].dev).toBe(true);
      expect(lockfile.packages['node_modules/typescript-eslint'].dev).toBe(true);
    });
  });

  describe('regression: unrelated fields unaffected', () => {
    test('runtime dependencies section is unchanged', () => {
      expect(pkg.dependencies).toEqual({
        '@commander-js/extra-typings': '^15.0.0',
        chalk: '^5.3.0',
        clear: '^0.1.0',
        commander: '^15.0.0',
        figlet: '^1.8.0',
        glob: '^13.0.0',
        mustache: '^4.2.0',
        'simple-markdown': '^0.7.3',
        yaml: '^2.8.1',
      });
    });

    test('engines.node requirement is unchanged', () => {
      expect(pkg.engines.node).toBe('>=22.12.0');
    });

    test('package metadata (name, version, main, bin) is unchanged', () => {
      expect(pkg.name).toBe('zettel-lint');
      expect(pkg.main).toBe('./lib/zl.js');
      expect(pkg.bin['zettel-lint']).toBe('./lib/zl.js');
    });
  });
});