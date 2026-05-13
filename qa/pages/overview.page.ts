import { Page } from '@playwright/test';
import { AuthenticatedPage } from './authenticated.page';

/** Sidebar → "Overview". Vikunja's home dashboard lives at `/`. */
export class OverviewPage extends AuthenticatedPage {
  protected readonly path = '/';

  constructor(page: Page) {
    super(page);
  }
}
