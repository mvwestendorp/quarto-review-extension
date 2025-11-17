import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Quarto Review Extension
 *
 * Includes responsive testing across multiple viewport sizes:
 * - Mobile devices (iPhone SE, iPhone 13, Android)
 * - Tablet devices (iPad Mini, iPad Air)
 * - Desktop screens (HD, Full HD)
 */

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Sequential for stability with single dev server
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid multiple server startups
  reporter: 'html',
  timeout: 45000, // 45 seconds per test
  expect: { timeout: 10000 }, // 10 seconds for expect assertions
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    navigationTimeout: 30000,
  },
  projects: [
    // Desktop browser testing
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Removed firefox and webkit for faster test execution
    // Add them back if full browser coverage is needed
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // Mobile viewport testing (disabled by default, enable as needed)
    // Uncomment to run tests on mobile viewports
    // {
    //   name: 'mobile-iphone-se',
    //   use: {
    //     ...devices['iPhone SE'],
    //   },
    // },
    // {
    //   name: 'mobile-iphone-13',
    //   use: {
    //     ...devices['iPhone 13'],
    //   },
    // },
    // {
    //   name: 'mobile-pixel-5',
    //   use: {
    //     ...devices['Pixel 5'],
    //   },
    // },

    // Tablet viewport testing (disabled by default, enable as needed)
    // {
    //   name: 'tablet-ipad-mini',
    //   use: {
    //     ...devices['iPad Mini'],
    //   },
    // },
    // {
    //   name: 'tablet-ipad-air',
    //   use: {
    //     ...devices['iPad (gen 7)'],
    //   },
    // },
  ],
  webServer: {
    command: 'npm run serve:e2e',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes - allow more time in CI environments
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
