import { Page } from '@playwright/test';
import { IPage } from './interfaces/IPage';

export abstract class BasePage implements IPage {
  protected readonly page: Page;
  /** Path relative to baseURL — subclasses define this. */
  protected abstract readonly path: string;

  protected constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto(this.path);
    await this.waitUntilLoaded();
  }

  /** Subclasses override with a page-specific readiness check. */
  abstract waitUntilLoaded(): Promise<void>;

  async isLoaded(): Promise<boolean> {
    try {
      await this.waitUntilLoaded();
      return true;
    } catch {
      return false;
    }
  }

  url(): string {
    return this.page.url();
  }
}
