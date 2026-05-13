import { Page } from '@playwright/test';
import { AuthenticatedPage } from './authenticated.page';

/** Sidebar → "Teams". Team management lives at `/teams`. */
export class TeamsPage extends AuthenticatedPage {
  protected readonly path = '/teams';

  constructor(page: Page) {
    super(page);
  }
}
