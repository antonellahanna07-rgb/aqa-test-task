import { test, expect } from '../fixtures';

/**
 * Smoke check that the app boots and the configured `baseURL` resolves.
 * Useful as a one-liner sanity check in CI before running the full suite.
 */
test.describe('Smoke @smoke', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('home page responds and serves the Vikunja shell', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok()).toBeTruthy();
    await expect(page).toHaveTitle(/vikunja|to-?do/i);
  });
});
