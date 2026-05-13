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
    // Vikunja v2 renders the search affordance as a FontAwesome
    // magnifying-glass icon nested in a clickable wrapper (button or
    // anchor). Target that wrapper so toBeVisible/toBeEnabled hit the
    // interactive ancestor, not the aria-hidden SVG itself.
    super(
      page,
      page
        .locator(
          [
            'button:has(.fa-magnifying-glass)',
            'a:has(.fa-magnifying-glass)',
            '[role="button"]:has(.fa-magnifying-glass)',
            '[data-cy="search"]',
            '[data-cy="quick-actions"]',
          ].join(', '),
        )
        .first(),
    );
    this.trigger = this.root;
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
