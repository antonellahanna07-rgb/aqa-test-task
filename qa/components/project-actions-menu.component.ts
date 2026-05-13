import { Locator, Page } from '@playwright/test';
import { BaseComponent } from './base.component';

/**
 * The set of actions Vikunja exposes inside the project's 3-dots menu.
 * Centralised so tests can iterate without hard-coding strings.
 */
export const PROJECT_ACTIONS = ['Edit', 'Archive', 'Duplicate', 'Delete'] as const;
export type ProjectAction = (typeof PROJECT_ACTIONS)[number];

/**
 * The 3-dots (ellipsis) action menu that lives next to the project
 * title on the project details page. Vikunja v2 renders the trigger
 * as a button with a FontAwesome ellipsis icon
 * (`svg[data-icon="ellipsis"]`).
 *
 * Items are exposed two ways:
 *   - through {@link actionItem} (a single locator by action name)
 *   - through {@link clickAction} (open + click in one call)
 */
export class ProjectActionsMenu extends BaseComponent {
  constructor(page: Page) {
    super(
      page,
      page
        .locator(
          [
            'button:has(.fa-ellipsis)',
            'button:has(svg[data-icon="ellipsis"])',
            '[aria-label*="more" i]',
            '[aria-label*="actions" i]',
            '[data-cy="project-actions"]',
          ].join(', '),
        )
        .first(),
    );
  }

  async open(): Promise<void> {
    await this.root.click();
  }

  /** Locator for a specific action inside the open dropdown. */
  actionItem(name: ProjectAction): Locator {
    const re = new RegExp(`^\\s*${name}\\s*$`, 'i');
    return this.page
      .getByRole('link', { name: re })
      .or(this.page.getByRole('button', { name: re }))
      .or(this.page.getByRole('menuitem', { name: re }))
      .first();
  }

  /** Open the dropdown and click a specific action. */
  async clickAction(name: ProjectAction): Promise<void> {
    await this.open();
    await this.actionItem(name).click();
  }
}
