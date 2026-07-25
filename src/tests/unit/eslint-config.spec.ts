import { describe, expect, test, beforeAll } from 'vitest';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

describe('eslint.config.js', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let config: any[];

  beforeAll(async () => {
    const module = await import('../../../eslint.config.js');
    config = module.default;
  });

  describe('overall structure', () => {
    test('exports an array', () => {
      expect(Array.isArray(config)).toBe(true);
    });

    test('has exactly three configuration blocks', () => {
      expect(config).toHaveLength(3);
    });
  });

  describe('global ignores block', () => {
    test('ignores build output and dependency directories', () => {
      expect(config[0]).toEqual({
        ignores: ['node_modules/**', 'lib/**', 'dist/**', 'coverage/**'],
      });
    });

    test('does not restrict ignores to a "files" scope', () => {
      expect(config[0].files).toBeUndefined();
    });
  });

  describe('TypeScript source configuration', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tsBlock: any;

    beforeAll(() => {
      tsBlock = config[1];
    });

    test('targets all TypeScript files under src', () => {
      expect(tsBlock.files).toEqual(['src/**/*.ts']);
    });

    test('configures the typescript-eslint parser with type-checking', () => {
      expect(tsBlock.languageOptions.parser).toBe(tseslint.parser);
      expect(tsBlock.languageOptions.parserOptions).toEqual({
        project: './tsconfig.json',
        sourceType: 'module',
      });
    });

    test('uses latest ECMAScript version and ES modules', () => {
      expect(tsBlock.languageOptions.ecmaVersion).toBe('latest');
      expect(tsBlock.languageOptions.sourceType).toBe('module');
    });

    test('declares read-only Node.js globals', () => {
      expect(tsBlock.languageOptions.globals).toEqual({
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      });
    });

    test('merges recommended rule sets with correct override precedence', () => {
      const expectedRules = {
        ...js.configs.recommended.rules,
        ...tseslint.configs.recommended.rules,
        ...tseslint.configs.recommendedTypeChecked.rules,
        ...tseslint.configs.strictTypeChecked.rules,

        '@typescript-eslint/explicit-function-return-types': [
          'warn',
          { allowExpressions: true, allowTypedFunctionExpressions: true },
        ],
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/explicit-module-boundary-types': 'off',

        'no-console': 'off',
        'prefer-const': 'error',
        'no-var': 'error',
      };

      expect(tsBlock.rules).toEqual(expectedRules);
    });

    test('explicitly overrides no-console to allow CLI output', () => {
      // Regression guard: recommended rule sets must not re-enable no-console
      // for this CLI tool after future dependency upgrades.
      expect(tsBlock.rules['no-console']).toBe('off');
    });

    test('treats no-explicit-any as a warning rather than an error', () => {
      expect(tsBlock.rules['@typescript-eslint/no-explicit-any']).toBe('warn');
    });

    test('ignores unused vars/args prefixed with an underscore', () => {
      const [severity, options] = tsBlock.rules['@typescript-eslint/no-unused-vars'];
      expect(severity).toBe('error');
      expect(options).toEqual({ argsIgnorePattern: '^_', varsIgnorePattern: '^_' });
    });

    test('disables explicit-module-boundary-types in favor of inference', () => {
      expect(tsBlock.rules['@typescript-eslint/explicit-module-boundary-types']).toBe('off');
    });

    test('enforces prefer-const and no-var as errors', () => {
      expect(tsBlock.rules['prefer-const']).toBe('error');
      expect(tsBlock.rules['no-var']).toBe('error');
    });
  });

  describe('test file overrides', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let testBlock: any;

    beforeAll(() => {
      testBlock = config[2];
    });

    test('applies only to spec and test files', () => {
      expect(testBlock.files).toEqual(['src/**/*.spec.ts', 'src/**/*.test.ts']);
    });

    test('declares read-only Vitest globals', () => {
      expect(testBlock.languageOptions.globals).toEqual({
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      });
    });

    test('does not define its own rule overrides', () => {
      expect(testBlock.rules).toBeUndefined();
    });
  });
});