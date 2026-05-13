import { test, expect } from '../../src/fixtures';

test.describe('User login @smoke', () => {
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

  test('the API returns a JWT on valid credentials @api', async ({ anonApi, seededUser }) => {
    const token = await anonApi.users.login({
      username: seededUser.username,
      password: seededUser.password,
    });
    expect(token.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
  });
});
