import { Locator, Page } from '@playwright/test';
import { BaseComponent } from './base.component';

/**
 * User/account dropdown in the top navbar — owns the menu trigger and the
 * actions inside it (Settings, Logout, …). Reused on every authenticated
 * screen.
 */
export class AccountMenu extends BaseComponent {
  private readonly logoutItem: Locator;
  private readonly settingsItem: Locator;

  constructor(page: Page) {
    super(
      page,
      page
        .locator(
          [
            '[data-cy="user-menu"]',
            '.user-menu',
            '.username-dropdown',
            'button[aria-label*="account" i]',
            'button[aria-label*="user" i]',
          ].join(', '),
        )
        .first(),
    );
    this.logoutItem = page
      .getByRole('button', { name: /log\s*out/i })
      .or(page.getByRole('menuitem', { name: /log\s*out/i }))
      .or(page.getByRole('link', { name: /log\s*out/i }))
      .first();
    this.settingsItem = page.getByRole('link', { name: /settings/i }).first();
  }

  async open(): Promise<void> {
    await this.root.click();
  }

  async logout(): Promise<void> {
    await this.open();
    await this.logoutItem.click();
  }

  async goToSettings(): Promise<void> {
    await this.open();
    await this.settingsItem.click();
  }
}
