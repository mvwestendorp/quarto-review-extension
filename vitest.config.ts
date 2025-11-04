import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    // Exclude E2E tests - they are run separately with 'npm run test:e2e' using Playwright
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'tests/**',
        'dist/**',
        'node_modules/**',
        // Exclude stub providers with intentional notImplemented() methods
        'src/modules/git/providers/gitea.ts',
        'src/modules/git/providers/gitlab.ts',
        'src/modules/git/providers/local.ts',
      ],
      // Quality thresholds - fail if coverage drops below these
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 50,
        statements: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@modules': resolve(__dirname, 'src/modules'),
      '@utils': resolve(__dirname, 'src/utils'),
    },
  },
});
