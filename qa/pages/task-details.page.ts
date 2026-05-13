import { Locator, Page } from '@playwright/test';
import { AuthenticatedPage } from './authenticated.page';

/**
 * Task details screen — Vikunja's `/tasks/<id>` route. Inherits the
 * Sidebar + NavBar shell from {@link AuthenticatedPage}; the page-
 * specific surface is the task title heading and the "Mark as done"
 * affordance.
 *
 * The class can be constructed two ways:
 *   - with a `taskId` so `goto()` navigates directly, or
 *   - without an id so a test that already opened the task (e.g. by
 *     clicking it on the project details page) can assert on the
 *     current page without re-navigating.
 */
export class TaskDetailsPage extends AuthenticatedPage {
  protected readonly path: string;

  /** Heading that displays the task's title at the top of the page. */
  readonly taskTitleHeading: Locator;
  /** Primary "Mark as done" affordance on the task details screen. */
  readonly markAsDoneButton: Locator;

  constructor(page: Page, taskId?: number) {
    super(page);
    this.path = taskId !== undefined ? `/tasks/${taskId}` : '';
    this.taskTitleHeading = page
      .locator('h1, h2, .task-title, [class*="task-title" i]')
      .first();
    // Cover the common label variants: "Mark as done", "Done",
    // "Complete", "Mark task done", etc. First match wins.
    this.markAsDoneButton = page
      .getByRole('button', { name: /mark.*(as)?.*done|^\s*done\s*$|^\s*complete\s*$/i })
      .or(page.getByRole('link', { name: /mark.*(as)?.*done|^\s*done\s*$|^\s*complete\s*$/i }))
      .first();
  }

  async waitUntilLoaded(): Promise<void> {
    await this.sidebar.waitUntilReady();
    await this.taskTitleHeading.waitFor({ state: 'visible' });
  }
}
