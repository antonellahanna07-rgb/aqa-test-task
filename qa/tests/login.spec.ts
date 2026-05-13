import { test, expect } from '../fixtures';

test.describe('Login @smoke', () => {
  // These tests start unauthenticated even though the default context
  // carries the worker's storageState.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('a registered user can log in via the UI', async ({
    page,
    loginPage,
    dashboardPage,
    seededUser,
  }) => {
    await loginPage.goto();
    await loginPage.login(seededUser.username, seededUser.password);

    await page.waitForURL((url) => !/\/login$/.test(url.toString()));
    await dashboardPage.waitUntilLoaded();
  });

  test('login fails with the wrong password', async ({ loginPage, seededUser }) => {
    await loginPage.goto();
    await loginPage.login(seededUser.username, 'definitely-not-the-right-pw');

    await expect.poll(async () => loginPage.errorMessage()).not.toBeNull();
  });
});
