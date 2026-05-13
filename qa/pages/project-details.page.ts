import { Locator, Page } from '@playwright/test';
import { AuthenticatedPage } from './authenticated.page';

/**
 * Vikunja v2 auto-routes to `/projects/<id>` after creating a project,
 * so this page object is what tests assert against once a `Create`
 * round-trip completes. The same class is used to navigate directly
 * to a known project id via `goto()`.
 *
 * Inherits the authenticated shell (Sidebar + NavBar) from
 * {@link AuthenticatedPage} so the only thing this class owns is the
 * page-specific content: the project title and the task surface that
 * future task tests will hook into.
 */
export class ProjectDetailsPage extends AuthenticatedPage {
  protected readonly path: string;

  /** Heading that displays the project's title at the top of the page. */
  readonly projectTitleHeading: Locator;
  /** Input for adding a new task — used by upcoming task-related tests. */
  readonly newTaskInput: Locator;

  /**
   * @param projectId  When provided, `goto()` navigates to
   *                   `/projects/<id>`. When omitted, the page object
   *                   is intended for inspecting whatever project page
   *                   the test is already on (e.g. right after creating
   *                   one via the UI).
   */
  constructor(page: Page, projectId?: number) {
    super(page);
    this.path = projectId !== undefined ? `/projects/${projectId}` : '';
    this.projectTitleHeading = page
      .locator('h1, h2, .project-title, [class*="project-title" i]')
      .first();
    this.newTaskInput = page
      .getByPlaceholder(/add a (new )?task/i)
      .or(page.getByRole('textbox', { name: /task/i }))
      .first();
  }

  async waitUntilLoaded(): Promise<void> {
    // Authenticated shell first…
    await this.sidebar.waitUntilReady();
    // …then the page-specific title heading.
    await this.projectTitleHeading.waitFor({ state: 'visible' });
  }
}
