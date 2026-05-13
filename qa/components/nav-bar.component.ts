import { Page } from '@playwright/test';
import { BaseComponent } from './base.component';
import { Search } from './search.component';
import { Notifications } from './notifications.component';
import { AccountMenu } from './account-menu.component';
import { HamburgerMenu } from './hamburger-menu.component';

/**
 * Top navbar — present on every authenticated screen. The navbar itself
 * is just the container; the interactive pieces (search, notifications,
 * account menu, hamburger) live in their own components so they can be
 * tested and reused independently.
 */
export class NavBar extends BaseComponent {
  readonly search: Search;
  readonly notifications: Notifications;
  readonly account: AccountMenu;
  readonly hamburger: HamburgerMenu;

  constructor(page: Page) {
    super(page, page.locator('header, nav.navbar, [data-cy="navbar"]').first());
    this.search = new Search(page);
    this.notifications = new Notifications(page);
    this.account = new AccountMenu(page);
    this.hamburger = new HamburgerMenu(page);
  }

  /** Convenience: log out via the account menu. */
  async logout(): Promise<void> {
    await this.account.logout();
  }
}
