import { test, expect } from '../fixtures';

test.describe('Logout @smoke', () => {
  test('logging out from the account menu returns the user to /login', async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await dashboardPage.navbar.logout();
    await expect(page).toHaveURL(/\/login/);
  });

  test('after logout the protected dashboard redirects to /login', async ({
    page,
    dashboardPage,
  }) => {
    // Sanity: the worker storageState makes us authenticated on goto().
    await dashboardPage.goto();
    await dashboardPage.navbar.logout();
    await expect(page).toHaveURL(/\/login/);

    // Now try to revisit `/` — without a valid session we should be
    // bounced back to /login, proving the logout actually cleared the
    // session and isn't merely a client-side route change.
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });
});
