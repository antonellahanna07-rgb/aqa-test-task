import { Page } from '@playwright/test';
import { AuthenticatedPage } from './authenticated.page';

/** Sidebar → "Upcoming". Vikunja groups upcoming tasks at `/tasks/by/upcoming`. */
export class UpcomingPage extends AuthenticatedPage {
  protected readonly path = '/tasks/by/upcoming';

  constructor(page: Page) {
    super(page);
  }
}
