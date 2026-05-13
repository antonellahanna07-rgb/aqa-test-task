import { Locator, Page } from '@playwright/test';

/**
 * Root abstraction for any reusable UI panel.
 *
 * A component is *not* a page. It is a sub-tree of the DOM (anchored at
 * `root`) that exposes a behavior contract independent of which page hosts
 * it. Pages compose components — they don't inherit from them — which keeps
 * each class focused on one responsibility (SRP) and lets the same
 * Sidebar/NavBar work across many pages (Open/Closed).
 */
export abstract class BaseComponent {
  protected readonly page: Page;
  /** The DOM scope this component owns. All locators must be derived from it. */
  readonly root: Locator;

  protected constructor(page: Page, root: Locator) {
    this.page = page;
    this.root = root;
  }

  async isVisible(): Promise<boolean> {
    return this.root.isVisible();
  }

  async waitUntilReady(timeoutMs = 10_000): Promise<void> {
    await this.root.waitFor({ state: 'visible', timeout: timeoutMs });
  }
}
