import { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

export class RegisterPage extends BasePage {
  protected readonly path = '/register';
  private readonly username: Locator;
  private readonly email: Locator;
  private readonly password: Locator;
  private readonly passwordConfirm: Locator;
  private readonly submit: Locator;
  private readonly errorBanner: Locator;

  constructor(page: Page) {
    super(page);
    // Match the same pattern Vikunja v2 uses on the login page — accessible
    // names rather than <label for=...> associations.
    this.username = page.getByRole('textbox', { name: /^\s*username\s*$/i });
    this.email = page.getByRole('textbox', { name: /e-?mail/i });
    this.password = page.getByRole('textbox', { name: /^\s*password\s*$/i });
    this.passwordConfirm = page.getByRole('textbox', {
      name: /confirm.*password|password.*confirm|repeat.*password/i,
    });
    this.submit = page.getByRole('button', { name: /create.*account|register|sign\s*up/i });
    this.errorBanner = page.locator('.notification.is-danger, [role="alert"]').first();
  }

  async waitUntilLoaded(): Promise<void> {
    await this.submit.waitFor({ state: 'visible' });
  }

  async register(payload: { username: string; email: string; password: string }): Promise<void> {
    await this.username.fill(payload.username);
    await this.email.fill(payload.email);
    await this.password.fill(payload.password);
    if (await this.passwordConfirm.isVisible().catch(() => false)) {
      await this.passwordConfirm.fill(payload.password);
    }
    await this.submit.click();
  }

  async errorMessage(): Promise<string | null> {
    if (await this.errorBanner.isVisible().catch(() => false)) {
      return (await this.errorBanner.innerText()).trim();
    }
    return null;
  }
}
