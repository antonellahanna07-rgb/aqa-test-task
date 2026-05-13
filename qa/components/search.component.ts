import { Locator, Page } from '@playwright/test';
import { BaseComponent } from './base.component';

/**
 * Quick-search affordance that lives in the top navbar across every
 * authenticated screen. The visible element is sometimes a trigger
 * (icon/button) that opens a search input — we expose both so a test can
 * either assert on the trigger's visibility or actually run a search.
 */
export class Search extends BaseComponent {
  /** Trigger that opens the search input (or the input itself when always-visible). */
  readonly trigger: Locator;
  /** The search input — only visible after `open()` on builds that hide it behind the trigger. */
  readonly input: Locator;

  constructor(page: Page) {
    super(
      page,
      page
        .locator(
          [
            '[data-cy="search"]',
            '[data-cy="quick-actions"]',
            '.quick-actions',
            '[class*="search" i]',
          ].join(', '),
        )
        .first(),
    );
    this.trigger = page
      .getByRole('button', { name: /search|quick\s*actions/i })
      .or(page.locator('.search-button, [class*="search-button" i]'))
      .first();
    this.input = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i)).first();
  }

  async open(): Promise<void> {
    if (await this.trigger.isVisible().catch(() => false)) {
      await this.trigger.click();
    }
    await this.input.waitFor({ state: 'visible' });
  }

  async search(query: string): Promise<void> {
    await this.open();
    await this.input.fill(query);
    await this.input.press('Enter');
  }
}
