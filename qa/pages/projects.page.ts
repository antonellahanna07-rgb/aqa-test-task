import { Page } from '@playwright/test';
import { AuthenticatedPage } from './authenticated.page';

/** Sidebar → "Projects". The projects list view at `/projects`. */
export class ProjectsPage extends AuthenticatedPage {
  protected readonly path = '/projects';

  constructor(page: Page) {
    super(page);
  }
}
