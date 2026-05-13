import { test, expect } from '../fixtures';
import { UserFactory } from '../fixtures/factories';

test.describe('Login @smoke', () => {
  // These tests start unauthenticated even though the default context
  // carries the worker's storageState.
  test.use({ storageState: { cookies: [], origins: [] } });

  // Vikunja v2's identifier field accepts either a username or an email.
  // Parameterize over both paths so each is an explicit, named test case
  // rather than relying on a generic "logs in via the UI" wording.
  for (const identifier of ['username', 'email'] as const) {
    test(`a registered user can log in using their ${identifier}`, async ({
      page,
      loginPage,
      dashboardPage,
      seededUser,
    }) => {
      await loginPage.goto();
      await loginPage.login(seededUser[identifier], seededUser.password);

      await page.waitForURL((url) => !/\/login$/.test(url.toString()));
      await dashboardPage.waitUntilLoaded();
    });
  }

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

  test('login fails with an email that does not exist', async ({ loginPage }) => {
    // Symmetric to the unknown-username test — Vikunja accepts either
    // identifier, so both rejection paths should surface an error.
    const ghost = UserFactory.build();
    await loginPage.goto();
    await loginPage.login(ghost.email, ghost.password);

    await expect.poll(async () => loginPage.errorMessage()).not.toBeNull();
  });

  test('the "stay logged in" checkbox is present and toggleable', async ({ loginPage }) => {
    await loginPage.goto();
    await expect(loginPage.stayLoggedInCheckbox).toBeVisible();

    // Defaults to unchecked — Vikunja is opt-in for long-lived sessions.
    await expect(loginPage.stayLoggedInCheckbox).not.toBeChecked();

    // User can opt in...
    await loginPage.stayLoggedInCheckbox.check();
    await expect(loginPage.stayLoggedInCheckbox).toBeChecked();

    // ...and back out.
    await loginPage.stayLoggedInCheckbox.uncheck();
    await expect(loginPage.stayLoggedInCheckbox).not.toBeChecked();
  });

  test('clicking "forgot your password?" opens the password recovery flow', async ({
    page,
    loginPage,
  }) => {
    await loginPage.goto();
    await loginPage.clickForgotPassword();

    // Vikunja's recovery flow is typically either a URL change or a
    // recovery form rendered in place — accept either signal so the
    // test isn't tied to a specific UX choice.
    await expect
      .poll(async () => {
        if (!/\/login\/?$/.test(page.url())) return true;
        const cue = page.getByRole('button', { name: /reset|send|recover|request/i }).first();
        return cue.isVisible().catch(() => false);
      })
      .toBe(true);
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
