import { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

export interface RegisterFormValues {
  username: string;
  email: string;
  password: string;
}

export class RegisterPage extends BasePage {
  protected readonly path = '/register';
  private readonly username: Locator;
  private readonly email: Locator;
  private readonly password: Locator;
  private readonly passwordConfirm: Locator;
  /**
   * Exposed as a public readonly locator so tests can assert on its
   * enabled/disabled state without going through a wrapper method.
   */
  readonly submitButton: Locator;
  private readonly errorBanner: Locator;
  private readonly loginLink: Locator;

  constructor(page: Page) {
    super(page);
    this.username = page.getByRole('textbox', { name: /^\s*username\s*$/i });
    this.email = page.getByRole('textbox', { name: /e-?mail/i });
    this.password = page.getByRole('textbox', { name: /^\s*password\s*$/i });
    this.passwordConfirm = page.getByRole('textbox', {
      name: /confirm.*password|password.*confirm|repeat.*password/i,
    });
    this.submitButton = page.getByRole('button', { name: /create.*account|register|sign\s*up/i });
    this.errorBanner = page
      .locator('.message.danger, .notification.is-danger, [role="alert"]')
      .first();
    // Cross-page link/button taking the user from /register back to /login.
    // Match either a link or a button to keep the contract resilient to
    // markup changes.
    this.loginLink = page
      .getByRole('link', { name: /^\s*log\s*in\s*$/i })
      .or(page.getByRole('button', { name: /^\s*log\s*in\s*$/i }))
      .first();
  }

  async waitUntilLoaded(): Promise<void> {
    await this.submitButton.waitFor({ state: 'visible' });
  }

  /** Fill the form without submitting. */
  async fillForm(values: RegisterFormValues): Promise<void> {
    await this.username.fill(values.username);
    await this.email.fill(values.email);
    await this.password.fill(values.password);
    if (await this.passwordConfirm.isVisible().catch(() => false)) {
      await this.passwordConfirm.fill(values.password);
    }
  }

  /** Move focus off the email field so the form's blur-based validation fires. */
  async blurEmail(): Promise<void> {
    await this.email.blur();
  }

  async submitForm(): Promise<void> {
    await this.submitButton.click();
  }

  /** Convenience: fill + submit in one call. */
  async register(values: RegisterFormValues): Promise<void> {
    await this.fillForm(values);
    await this.submitForm();
  }

  /**
   * Touch a field and clear its value so the form treats it as edited
   * but empty. We use real keyboard clearing (Ctrl+A → Backspace) rather
   * than `fill('')` because some Vue forms react to keyboard events more
   * reliably than to programmatic value sets.
   */
  async clearField(field: 'username' | 'email' | 'password'): Promise<void> {
    const locator = this.inputFor(field);
    await locator.click();
    await locator.press('ControlOrMeta+A');
    await locator.press('Backspace');
    await locator.blur();
  }

  /**
   * Inline error scoped to a specific field. Vikunja v2 renders these as
   * <p class="help is-danger"> and the error text always contains the
   * field's name ("Please provide a username.", "Please enter a valid
   * email address.", …). Filtering by text identifies the right error
   * without depending on the surrounding DOM structure.
   */
  fieldError(field: 'username' | 'email' | 'password'): Locator {
    return this.page
      .locator('.help.is-danger, .help.danger, .message.danger')
      .filter({ hasText: new RegExp(field, 'i') })
      .first();
  }

  private inputFor(field: 'username' | 'email' | 'password'): Locator {
    switch (field) {
      case 'username':
        return this.username;
      case 'email':
        return this.email;
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

  /** Click the "Login" link/button on the register page. */
  async goToLogin(): Promise<void> {
    await this.loginLink.click();
  }
}
