import { Page } from '@playwright/test';
import { AuthenticatedPage } from './authenticated.page';

/** Sidebar → "Labels". Label management lives at `/labels`. */
export class LabelsPage extends AuthenticatedPage {
  protected readonly path = '/labels';

  constructor(page: Page) {
    super(page);
  }
}
