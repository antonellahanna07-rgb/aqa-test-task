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

  test('the register button is disabled when required fields are empty', async ({
    registerPage,
  }) => {
    await registerPage.goto();
    // Form opens with empty fields → client-side validation should keep
    // the submit button disabled until the user provides values.
    await expect(registerPage.submitButton).toBeDisabled();
  });

  test('clicking the login button on the signup screen navigates to /login', async ({
    page,
    registerPage,
  }) => {
    await registerPage.goto();
    await registerPage.goToLogin();
    await expect(page).toHaveURL(/\/login/);
  });

  test('the register form rejects an invalid email format', async ({ registerPage }) => {
    const user = UserFactory.build();

    await registerPage.goto();
    await registerPage.fillForm({
      username: user.username,
      email: 'not-a-valid-email',
      password: user.password,
    });
    // Trigger validation: blur the email field, and click submit if the
    // form lets us (some implementations gate submit on validity, others
    // surface the error only after a submit attempt — we accept either).
    await registerPage.blurEmail();
    if (!(await registerPage.submitButton.isDisabled())) {
      await registerPage.submitForm().catch(() => {
        /* the button may flip to disabled mid-click */
      });
    }

    // Whichever path Vikunja takes, the UI must end up indicating the
    // invalid input — either through a visible error or by refusing to
    // enable submit.
    await expect
      .poll(async () => {
        const err = await registerPage.errorMessage();
        if (err) return true;
        return await registerPage.submitButton.isDisabled();
      })
      .toBe(true);
  });
});
