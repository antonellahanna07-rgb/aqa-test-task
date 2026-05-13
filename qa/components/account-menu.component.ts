import { Locator, Page } from '@playwright/test';
import { BaseComponent } from './base.component';

/**
 * The set of entries Vikunja renders inside the account dropdown.
 * Centralised so tests can iterate over them without hard-coding strings.
 */
export const ACCOUNT_MENU_ITEMS = [
  'Settings',
  'Keyboard shortcuts',
  'About',
  'Logout',
] as const;
export type AccountMenuItem = (typeof ACCOUNT_MENU_ITEMS)[number];

/**
 * User/account dropdown in the top navbar. Owns the menu trigger and
 * every actionable entry inside the menu. Reused on every authenticated
 * screen.
 *
 * Items are exposed two ways:
 *   - as individual readonly locators (`settingsItem`,
 *     `keyboardShortcutsItem`, `aboutItem`, `logoutItem`) for direct
 *     assertion or click
 *   - through {@link menuItem} for parameterized iteration over
 *     {@link ACCOUNT_MENU_ITEMS}
 */
export class AccountMenu extends BaseComponent {
  readonly settingsItem: Locator;
  readonly keyboardShortcutsItem: Locator;
  readonly aboutItem: Locator;
  readonly logoutItem: Locator;

  constructor(page: Page) {
    super(
      page,
      page
        .locator(
          [
            'button:has(.username)',
            'a:has(.username)',
            '[role="button"]:has(.username)',
            '[data-cy="user-menu"]',
            '.user-menu',
          ].join(', '),
        )
        .first(),
    );
    this.settingsItem = AccountMenu.itemLocator(page, 'Settings');
    this.keyboardShortcutsItem = AccountMenu.itemLocator(page, 'Keyboard shortcuts');
    this.aboutItem = AccountMenu.itemLocator(page, 'About');
    this.logoutItem = AccountMenu.itemLocator(page, 'Logout');
  }

  /** Open the dropdown by clicking the trigger. */
  async open(): Promise<void> {
    await this.root.click();
  }

  /** Locator for a specific menu entry — used to iterate over ACCOUNT_MENU_ITEMS. */
  menuItem(name: AccountMenuItem): Locator {
    switch (name) {
      case 'Settings':
        return this.settingsItem;
      case 'Keyboard shortcuts':
        return this.keyboardShortcutsItem;
      case 'About':
        return this.aboutItem;
      case 'Logout':
        return this.logoutItem;
    }
  }

  /** Open the menu and click a specific entry. */
  async clickItem(name: AccountMenuItem): Promise<void> {
    await this.open();
    await this.menuItem(name).click();
  }

  /** Convenience: open the menu and click Logout. */
  async logout(): Promise<void> {
    await this.clickItem('Logout');
  }

  /** Convenience: open the menu and click Settings. */
  async goToSettings(): Promise<void> {
    await this.clickItem('Settings');
  }

  /**
   * Match a menu entry by its accessible name. Vikunja v2 renders these
   * as links/buttons in a dropdown appended to the document body (not
   * scoped to the trigger), so we search at the page level.
   */
  private static itemLocator(page: Page, name: AccountMenuItem): Locator {
    const re = new RegExp(`^\\s*${name.replace(/\s+/g, '\\s*')}\\s*$`, 'i');
    return page
      .getByRole('link', { name: re })
      .or(page.getByRole('button', { name: re }))
      .or(page.getByRole('menuitem', { name: re }))
      .first();
  }
}
