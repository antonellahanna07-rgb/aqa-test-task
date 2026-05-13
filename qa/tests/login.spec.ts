import { test, expect } from '../fixtures';
import { UserFactory } from '../fixtures/factories';

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

  test('a registered user can log in using their email instead of their username', async ({
    page,
    loginPage,
    dashboardPage,
    seededUser,
  }) => {
    // Vikunja v2's identifier field accepts either a username or an email,
    // so a user who registered with an email should be able to sign in
    // with it interchangeably.
    await loginPage.goto();
    await loginPage.login(seededUser.email, seededUser.password);

    await page.waitForURL((url) => !/\/login$/.test(url.toString()));
    await dashboardPage.waitUntilLoaded();
  });

  test('login fails with the wrong password', async ({ loginPage, seededUser }) => {
    await loginPage.goto();
    await loginPage.login(seededUser.username, 'definitely-not-the-right-pw');

    await expect.poll(async () => loginPage.errorMessage()).not.toBeNull();
  });

  test('login fails with a username that does not exist', async ({ loginPage }) => {
    // A user we never registered should be rejected at /login.
    const ghost = UserFactory.build();
    await loginPage.goto();
    await loginPage.login(ghost.username, ghost.password);

    await expect.poll(async () => loginPage.errorMessage()).not.toBeNull();
  });

  test('the login button is disabled when required fields are empty', async ({ loginPage }) => {
    await loginPage.goto();
    // Form opens with empty fields → client-side validation should keep
    // the submit button disabled until the user provides values.
    await expect(loginPage.submitButton).toBeDisabled();
  });

  // One test per required field: fill the form with valid input, then clear
  // a single field. The form should refuse to submit AND surface an inline
  // error scoped to that specific field.
  for (const field of ['username', 'password'] as const) {
    test(`leaving ${field} empty keeps submit disabled and shows a field-level error`, async ({
      loginPage,
    }) => {
      const user = UserFactory.build();

      await loginPage.goto();
      await loginPage.fillForm({ username: user.username, password: user.password });
      await loginPage.clearField(field);

      // Primary signal: client-side validation gates the button.
      await expect(loginPage.submitButton).toBeDisabled();
      // Secondary signal: an inline error appears beneath the empty field.
      await expect(loginPage.fieldError(field)).toBeVisible();
    });
  }

  test('clicking the create account button on the login screen navigates to /register', async ({
    page,
    loginPage,
  }) => {
    await loginPage.goto();
    await loginPage.goToRegister();
    await expect(page).toHaveURL(/\/register/);
  });
});
