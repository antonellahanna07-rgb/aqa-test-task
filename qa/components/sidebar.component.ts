import { Locator, Page } from '@playwright/test';
import { BaseComponent } from './base.component';

/**
 * The set of top-level menu entries Vikunja renders in the sidebar.
 * Centralised so tests can iterate over them without hard-coding strings.
 */
export const SIDEBAR_MENU_ITEMS = [
  'Overview',
  'Upcoming',
  'Projects',
  'Labels',
  'Teams',
  'Inbox',
] as const;
export type SidebarMenuItem = (typeof SIDEBAR_MENU_ITEMS)[number];

/**
 * Left sidebar shown on every authenticated page. Owns the menu links,
 * not their landing pages — each menu item's screen has its own page
 * object that's reached via {@link Sidebar.navigateTo}.
 */
export class Sidebar extends BaseComponent {
  constructor(page: Page) {
    super(page, page.locator('aside, nav.menu, [data-cy="sidebar"]').first());
  }

  /** Locator for a specific menu item (matches link or button by accessible name). */
  menuItem(name: SidebarMenuItem): Locator {
    const re = new RegExp(`^\\s*${name}\\s*$`, 'i');
    return this.root
      .getByRole('link', { name: re })
      .or(this.root.getByRole('button', { name: re }))
      .first();
  }

  async navigateTo(name: SidebarMenuItem): Promise<void> {
    await this.menuItem(name).click();
  }
}
