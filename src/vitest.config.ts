// filepath: /workspaces/zettel-lint/vitest.config.ts
import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['**/node_modules/**', '**/lib/**'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        ...configDefaults.exclude,
        'lib/**/*.*'
      ],
    },
  },

});
