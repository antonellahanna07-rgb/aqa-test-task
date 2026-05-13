import { Page } from '@playwright/test';
import { BaseComponent } from './base.component';

/**
 * Hamburger / collapse trigger in the top navbar — toggles the sidebar
 * open/closed. Reused on every authenticated screen.
 */
export class HamburgerMenu extends BaseComponent {
  constructor(page: Page) {
    super(
      page,
      page
        .locator(
          [
            '[data-cy="hamburger"]',
            '.hamburger',
            'button[aria-label*="menu" i]',
            'button[aria-label*="toggle" i]',
            '.menu-button',
          ].join(', '),
        )
        .first(),
    );
  }

  async toggle(): Promise<void> {
    await this.root.click();
  }
}
