import { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  protected readonly path = '/login';
  private readonly username: Locator;
  private readonly password: Locator;
  private readonly submit: Locator;
  private readonly errorBanner: Locator;
  private readonly registerLink: Locator;

  constructor(page: Page) {
    super(page);
    this.username = page.getByLabel(/username/i).or(page.getByPlaceholder(/username/i)).first();
    this.password = page.getByLabel(/password/i).or(page.getByPlaceholder(/password/i)).first();
    this.submit = page.getByRole('button', { name: /log\s*in/i });
    this.errorBanner = page.locator('.notification.is-danger, [role="alert"]').first();
    this.registerLink = page.getByRole('link', { name: /create.*account|register|sign up/i });
  }

  async waitUntilLoaded(): Promise<void> {
    await this.submit.waitFor({ state: 'visible' });
  }

  async login(username: string, password: string): Promise<void> {
    await this.username.fill(username);
    await this.password.fill(password);
    await this.submit.click();
  }

  async errorMessage(): Promise<string | null> {
    if (await this.errorBanner.isVisible().catch(() => false)) {
      return (await this.errorBanner.innerText()).trim();
    }
    return null;
  }

  async goToRegister(): Promise<void> {
    await this.registerLink.click();
  }
}
