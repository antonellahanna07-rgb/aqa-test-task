import { Locator, Page } from '@playwright/test';
import { BaseComponent } from './base.component';

/**
 * The views Vikunja exposes on a project's details page. Centralised so
 * tests can iterate over them without hard-coding strings.
 */
export const PROJECT_VIEWS = ['List', 'Gantt', 'Table', 'Kanban'] as const;
export type ProjectView = (typeof PROJECT_VIEWS)[number];

/**
 * The tab strip that switches between project views (List / Gantt /
 * Table / Kanban) on the project details page. Behaves as a component
 * because the same pattern may surface again on filtered views or
 * saved searches later — keeping it independent of the host page lets
 * future pages compose it without duplication.
 */
export class ProjectViewTabs extends BaseComponent {
  constructor(page: Page) {
    super(
      page,
      page
        .locator(
          [
            '[data-cy="project-views"]',
            '.project-view-tabs',
            '[role="tablist"]',
            '.tabs',
          ].join(', '),
        )
        .first(),
    );
  }

  /** Locator for a specific view tab by its visible name. */
  tab(name: ProjectView): Locator {
    const re = new RegExp(`^\\s*${name}\\s*$`, 'i');
    return this.page
      .getByRole('link', { name: re })
      .or(this.page.getByRole('tab', { name: re }))
      .or(this.page.getByRole('button', { name: re }))
      .first();
  }

  async switchTo(name: ProjectView): Promise<void> {
    await this.tab(name).click();
  }
}
