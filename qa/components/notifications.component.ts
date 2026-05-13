import { Page } from '@playwright/test';
import { BaseComponent } from './base.component';

/**
 * Notifications bell in the top navbar. Reused on every authenticated
 * screen — kept as its own component so future tests can assert on
 * unread counts, dropdown content, etc.
 */
export class Notifications extends BaseComponent {
  constructor(page: Page) {
    super(
      page,
      page
        .locator(
          [
            '[data-cy="notifications"]',
            '.notifications',
            'button[aria-label*="notification" i]',
            'a[aria-label*="notification" i]',
          ].join(', '),
        )
        .first(),
    );
  }

  /** Open the notifications panel/dropdown. */
  async open(): Promise<void> {
    await this.root.click();
  }
}
