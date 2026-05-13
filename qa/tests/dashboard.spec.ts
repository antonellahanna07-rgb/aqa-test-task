import { test, expect } from '../fixtures';

test.describe('Dashboard @smoke', () => {
  test('the authenticated dashboard renders the sidebar', async ({ dashboardPage }) => {
    await dashboardPage.goto();
    expect(await dashboardPage.sidebar.isVisible()).toBe(true);
  });

  test('the authenticated dashboard renders the navbar', async ({ dashboardPage }) => {
    await dashboardPage.goto();
    expect(await dashboardPage.navbar.isVisible()).toBe(true);
  });

  test('the authenticated user can log out from the navbar', async ({ page, dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.navbar.logout();

    // After logout we should be back on the public side of the app.
    await page.waitForURL((url) => /\/(login|register)?$/.test(url.toString()), {
      timeout: 10_000,
    });
  });
});
