import { test, expect } from '../fixtures';
import { UserFactory } from '../fixtures/factories';

test.describe('Authentication — UI @smoke', () => {
  // These tests start unauthenticated even though the default context
  // carries the worker's storageState.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('a new user can register via the UI and reach the dashboard', async ({
    page,
    registerPage,
    dashboardPage,
  }) => {
    const user = UserFactory.build();

    await registerPage.goto();
    await registerPage.register(user);

    await page.waitForURL((url) => !/\/register$/.test(url.toString()));
    await dashboardPage.waitUntilLoaded();
    expect(await dashboardPage.sidebar.isVisible()).toBe(true);
  });

  test('registering with an already-used username surfaces an error', async ({
    anonApi,
    registerPage,
  }) => {
    const user = UserFactory.build();
    await anonApi.users.register(user);

    await registerPage.goto();
    await registerPage.register(user);

    await expect.poll(async () => registerPage.errorMessage()).not.toBeNull();
  });

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
