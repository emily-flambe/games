import { defineConfig, devices } from '@playwright/test';

// In CI, use TEST_URL (deployed preview); locally use dev server
const baseURL = process.env.TEST_URL || 'http://localhost:8777';
const isRemote = !!process.env.TEST_URL;

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Only start local dev server when not using remote TEST_URL
  ...(isRemote ? {} : {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:8777',
      reuseExistingServer: true,
      timeout: 120000,
    },
  }),
});
