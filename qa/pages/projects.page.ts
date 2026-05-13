import { Locator, Page } from '@playwright/test';
import { AuthenticatedPage } from './authenticated.page';
import { NewProjectModal } from '../components/new-project-modal.component';

/**
 * Sidebar → "Projects". The projects list view at `/projects`.
 *
 * The "new project" affordance can live in a couple of places in
 * Vikunja v2 (sidebar `+`, page-level button); the locator union
 * catches both so the test isn't tied to a specific UX choice.
 */
export class ProjectsPage extends AuthenticatedPage {
  protected readonly path = '/projects';

  readonly newProjectButton: Locator;
  readonly modal: NewProjectModal;

  constructor(page: Page) {
    super(page);
    this.newProjectButton = page
      .getByRole('button', { name: /new\s*project|create\s*project|add\s*project/i })
      .or(page.getByRole('link', { name: /new\s*project|create\s*project|add\s*project/i }))
      .or(page.locator('[data-cy="new-project"], [aria-label*="new project" i]'))
      .first();
    this.modal = new NewProjectModal(page);
  }

  /** Open the new-project modal. */
  async openNewProjectModal(): Promise<void> {
    await this.newProjectButton.click();
    await this.modal.waitUntilReady();
  }

  /** Convenience: open modal + fill + submit. */
  async createProject(values: { title: string; description?: string }): Promise<void> {
    await this.openNewProjectModal();
    await this.modal.createProject(values);
  }

  /** Locator for a project card/row by its visible title. */
  projectCard(title: string): Locator {
    const re = new RegExp(`^\\s*${escapeRegExp(title)}\\s*$`, 'i');
    return this.page
      .getByRole('link', { name: re })
      .or(this.page.getByRole('heading', { name: re }))
      .or(this.page.locator('.project, .project-card, [data-cy="project-card"]').filter({ hasText: title }))
      .first();
  }

  async hasProject(title: string): Promise<boolean> {
    return (await this.projectCard(title).count()) > 0;
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
