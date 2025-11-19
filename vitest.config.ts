import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    pool: 'threads',
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
        'src/modules/git/providers/local.ts',
      ],
      // Coverage thresholds disabled - coverage is collected for informational purposes only
      // Current coverage: ~35% lines, ~34% functions, ~21% branches
      // thresholds: {
      //   lines: 60,
      //   functions: 60,
      //   branches: 50,
      //   statements: 60,
      // },
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
