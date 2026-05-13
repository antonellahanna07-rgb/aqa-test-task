import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import { ConfigManager } from './config/manager';

const cfg = ConfigManager.load();

export default defineConfig({
  testDir: './tests',
  outputDir: cfg.artifacts.resultsDir,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? Math.max(cfg.execution.retries, 1) : cfg.execution.retries,
  workers: cfg.execution.workers,
  timeout: 60_000,
  expect: { timeout: cfg.execution.expectTimeoutMs },
  reporter: [
    ['list'],
    ['html', { outputFolder: cfg.artifacts.reportDir, open: 'never' }],
    ['junit', { outputFile: path.join(cfg.artifacts.resultsDir, 'junit.xml') }],
  ],
  use: {
    baseURL: cfg.baseUrl,
    headless: cfg.execution.headless,
    launchOptions: { slowMo: cfg.execution.slowMo },
    actionTimeout: cfg.execution.actionTimeoutMs,
    navigationTimeout: cfg.execution.navigationTimeoutMs,
    trace: cfg.execution.trace,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: { Accept: 'application/json' },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'api',
      testMatch: /api\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
