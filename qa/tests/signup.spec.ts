import { test, expect } from '../fixtures';
import { UserFactory } from '../fixtures/factories';

test.describe('Signup @smoke', () => {
  // Signup tests must start unauthenticated even though the default
  // context carries the worker's storageState.
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
    // API-seed an existing user to keep the test fast and deterministic,
    // then exercise the UI path that should fail.
    const user = UserFactory.build();
    await anonApi.users.register(user);

    await registerPage.goto();
    await registerPage.register(user);

    await expect.poll(async () => registerPage.errorMessage()).not.toBeNull();
  });
});
