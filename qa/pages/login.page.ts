import { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

export interface LoginFormValues {
  /** A username or an email — Vikunja v2 accepts either. */
  username: string;
  password: string;
}

export class LoginPage extends BasePage {
  protected readonly path = '/login';
  private readonly username: Locator;
  private readonly password: Locator;
  /**
   * Exposed as a public readonly locator so tests can assert on its
   * enabled/disabled state without going through a wrapper method.
   */
  readonly submitButton: Locator;
  /** Exposed so tests can assert on visibility/checked state directly. */
  readonly stayLoggedInCheckbox: Locator;
  private readonly errorBanner: Locator;
  private readonly registerLink: Locator;
  private readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    super(page);
    // Vikunja v2 uses accessible names rather than <label for=...>:
    //   - "Username Or Email Address" for the identifier field
    //   - "Password" for the password field
    this.username = page.getByRole('textbox', { name: /username|e-?mail/i });
    this.password = page.getByRole('textbox', { name: /^\s*password\s*$/i });
    this.submitButton = page.getByRole('button', { name: /^\s*log\s*in\s*$/i });
    this.stayLoggedInCheckbox = page
      .getByLabel(/stay\s*logged\s*in|remember\s*me|stay\s*signed\s*in/i)
      .or(
        page.getByRole('checkbox', {
          name: /stay\s*logged\s*in|remember\s*me|stay\s*signed\s*in/i,
        }),
      )
      .first();
    this.errorBanner = page
      .locator('.message.danger, .notification.is-danger, [role="alert"]')
      .first();
    this.registerLink = page.getByRole('link', { name: /create.*account|register|sign\s*up/i });
    // "Forgot your password?" — typically a link, occasionally rendered
    // as a button. Cover both.
    this.forgotPasswordLink = page
      .getByRole('link', { name: /forgot.*password/i })
      .or(page.getByRole('button', { name: /forgot.*password/i }))
      .first();
  }

  async waitUntilLoaded(): Promise<void> {
    await this.submitButton.waitFor({ state: 'visible' });
  }

  /** Fill the form without submitting. */
  async fillForm(values: LoginFormValues): Promise<void> {
    await this.username.fill(values.username);
    await this.password.fill(values.password);
  }

  async submitForm(): Promise<void> {
    await this.submitButton.click();
  }

  /** Convenience: fill + submit in one call. */
  async login(username: string, password: string): Promise<void> {
    await this.fillForm({ username, password });
    await this.submitForm();
  }

  /**
   * Touch a field and clear its value so the form treats it as edited
   * but empty. Keyboard clearing is more reliable than `fill('')` for
   * triggering Vue's dirty/touched state.
   */
  async clearField(field: 'username' | 'password'): Promise<void> {
    const locator = this.inputFor(field);
    await locator.click();
    await locator.press('ControlOrMeta+A');
    await locator.press('Backspace');
    await locator.blur();
  }

  /**
   * Inline error scoped to a specific field. Vikunja v2 renders these as
   * <p class="help is-danger"> and the error text always contains the
   * field's name, so filtering by text identifies the right one without
   * depending on the surrounding markup.
   */
  fieldError(field: 'username' | 'password'): Locator {
    return this.page
      .locator('.help.is-danger, .help.danger, .message.danger')
      .filter({ hasText: new RegExp(field, 'i') })
      .first();
  }

  private inputFor(field: 'username' | 'password'): Locator {
    switch (field) {
      case 'username':
        return this.username;
      case 'password':
        return this.password;
    }
  }

  async errorMessage(): Promise<string | null> {
    if (await this.errorBanner.isVisible().catch(() => false)) {
      return (await this.errorBanner.innerText()).trim();
    }
    return null;
  }

  /** Click the "Create account" / "Register" link on the login page. */
  async goToRegister(): Promise<void> {
    await this.registerLink.click();
  }

  /** Click the "Forgot your password?" affordance on the login page. */
  async clickForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
  }
}
