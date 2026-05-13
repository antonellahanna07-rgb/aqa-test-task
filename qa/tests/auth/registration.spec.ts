import { test, expect } from '../../src/fixtures';
import { UserFactory } from '../../src/factories/UserFactory';

test.describe('User registration @smoke', () => {
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
});
