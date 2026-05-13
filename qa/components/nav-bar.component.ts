import { Locator, Page } from '@playwright/test';
import { BaseComponent } from './base.component';

export class NavBar extends BaseComponent {
  private readonly userMenuTrigger: Locator;
  private readonly logoutBtn: Locator;

  constructor(page: Page) {
    super(page, page.locator('header, nav.navbar, [data-cy="navbar"]').first());
    this.userMenuTrigger = this.root
      .locator('[data-cy="user-menu"], .user-menu, button:has-text("Account")')
      .first();
    this.logoutBtn = page.getByRole('button', { name: /log\s*out/i });
  }

  async openUserMenu(): Promise<void> {
    await this.userMenuTrigger.click();
  }

  async logout(): Promise<void> {
    await this.openUserMenu();
    await this.logoutBtn.click();
  }
}
