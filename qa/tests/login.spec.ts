import { test, expect } from '../fixtures';
import { UserFactory } from '../fixtures/factories';
import { LoginPage } from '../pages/login.page';
import { ConfigManager } from '../config/manager';

/**
 * Decode the payload of a Vikunja JWT (URL-safe base64) and return the
 * claims as an object. Vikunja signs with HS256, but we only need the
 * payload here so signature verification isn't needed.
 */
function decodeJwtPayload(token: string): Record<string, unknown> {
  const [, payloadB64] = token.split('.');
  if (!payloadB64) throw new Error('Malformed JWT — no payload segment');
  return JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as Record<
    string,
    unknown
  >;
}

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

  test('checking "stay logged in" issues a longer-lived auth token', async ({
    browser,
    seededUser,
  }) => {
    // Observed finding on Vikunja v2.3.0 (local SQLite, 2026-05-13):
    // both code paths issue JWTs with identical `exp` claims; the
    // measured delta is single-digit seconds, consistent with clock
    // progression between the two logins. The "stay logged in" toggle
    // is either cosmetic in this build, or persistence is enforced
    // through a mechanism not observable from the client (refresh
    // logic, server-side session, etc.).
    //
    // The test is intentionally retained and marked `test.fail()` so:
    //   - the report documents the finding on every run
    //   - if Vikunja's behavior changes upstream, the test will flip
    //     from "expected fail" to "unexpected pass", prompting cleanup
    test.fail(
      true,
      'Vikunja v2.3.0 issues JWTs with identical lifetimes regardless of "stay logged in".',
    );

    // Log in twice in fresh contexts so each request issues an
    // independent JWT, then compare the `exp` claim of both.
    // This asserts the *backend* honored the persistent-session toggle
    // — not just that the UI flipped a checkbox.
    const cfg = ConfigManager.get();

    async function loginAndReadExp(stayLoggedIn: boolean): Promise<number> {
      const ctx = await browser.newContext({ baseURL: cfg.baseUrl });
      const page = await ctx.newPage();
      try {
        const login = new LoginPage(page);
        await login.goto();
        if (stayLoggedIn) await login.stayLoggedInCheckbox.check();
        await login.login(seededUser.username, seededUser.password);
        await page.waitForURL((url) => !/\/login\/?$/.test(url.toString()));

        const token = await page.evaluate(() => localStorage.getItem('token'));
        if (!token) throw new Error('Expected a JWT in localStorage after login, found none.');

        const payload = decodeJwtPayload(token);
        if (typeof payload.exp !== 'number') {
          throw new Error('JWT payload is missing a numeric `exp` claim.');
        }
        return payload.exp;
      } finally {
        await ctx.close();
      }
    }

    const expWithFlag = await loginAndReadExp(true);
    const expWithoutFlag = await loginAndReadExp(false);

    expect(expWithFlag).toBeGreaterThan(expWithoutFlag);
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
