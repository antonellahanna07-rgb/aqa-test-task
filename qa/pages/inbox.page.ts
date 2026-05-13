import { Page } from '@playwright/test';
import { AuthenticatedPage } from './authenticated.page';

/**
 * Sidebar → "Inbox". Vikunja's Inbox is a special pinned project; on
 * v2.3.0 the canonical path is `/projects/-1`. If your build routes it
 * differently, this is the single line to change.
 */
export class InboxPage extends AuthenticatedPage {
  protected readonly path = '/projects/-1';

  constructor(page: Page) {
    super(page);
  }
}
