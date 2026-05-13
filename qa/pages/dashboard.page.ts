import { Page } from '@playwright/test';
import { AuthenticatedPage } from './authenticated.page';

/**
 * Authenticated home/dashboard at `/`. Inherits the Sidebar + NavBar
 * composition from {@link AuthenticatedPage} so the shell isn't
 * duplicated across menu-item pages.
 */
export class DashboardPage extends AuthenticatedPage {
  protected readonly path = '/';

  constructor(page: Page) {
    super(page);
  }
}
