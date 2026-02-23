import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'puppeteer-server',
      use: {
        ...devices['Desktop Chrome'],
        headless: false,
        channel: 'chrome',
      },
    },
  ],
  testDir: './tests',
  outputDir: './playwright-report',
});