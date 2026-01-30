import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Sequential for stability with single dev server
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid multiple server startups
  reporter: 'html',
  timeout: 30000, // 30 seconds per test (reduced for faster feedback)
  expect: { timeout: 5000 }, // 5 seconds for expect assertions (reduced for faster feedback)
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    navigationTimeout: 15000, // 15 seconds (reduced for faster feedback)
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], headless: true },
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
