import { Page } from '@playwright/test';
import { AuthenticatedPage } from './authenticated.page';

/**
 * Authenticated home/dashboard at `/`. Inherits the Sidebar + NavBar
 * composition from {@link AuthenticatedPage} so the shell isn't
 * duplicated across menu-item pages.
 *
 * Home renders slower than the menu-item routes because Vikunja
 * fetches favorites/recent on cold start, so we give the sidebar a
 * longer ceiling than the default before declaring it missing.
 */
export class DashboardPage extends AuthenticatedPage {
  protected readonly path = '/';

  constructor(page: Page) {
    super(page);
  }

  async waitUntilLoaded(): Promise<void> {
    await this.sidebar.waitUntilReady(20_000);
  }
}
