import { Locator, Page } from '@playwright/test';
import { BaseComponent } from './base.component';

/**
 * Task list panel embedded inside a project's details screen.
 *
 * Decoupled from the page object so it can be reused on any future
 * screen that also renders a task list (filtered views, upcoming,
 * favorites, etc.). The component owns:
 *   - the "add a task" input + optional add button
 *   - the rendered task items
 * Tests assert and act through the affordance methods rather than
 * raw locators, which keeps the call sites readable.
 */
export class TaskList extends BaseComponent {
  readonly addTaskInput: Locator;
  readonly addTaskButton: Locator;
  readonly items: Locator;

  constructor(page: Page) {
    super(
      page,
      page
        .locator(
          [
            '[data-cy="task-list"]',
            '.tasks',
            '.task-list',
            '.task-container',
            '[class*="task-list" i]',
          ].join(', '),
        )
        .first(),
    );
    this.addTaskInput = page
      .getByPlaceholder(/add a (new )?task/i)
      .or(page.getByRole('textbox', { name: /add a (new )?task/i }))
      .first();
    this.addTaskButton = page
      .getByRole('button', { name: /^\s*(add|create)\s*(task)?\s*$/i })
      .first();
    this.items = page
      .locator(
        [
          '[data-cy="task-item"]',
          '.task-item',
          '.single-task',
          '[class*="task-item" i]',
        ].join(', '),
      );
  }

  /**
   * Add a task by title. Vikunja v2 typically lets the user press Enter
   * to commit; some builds also render an explicit "Add" button. We
   * use whichever exists.
   */
  async addTask(title: string): Promise<void> {
    await this.addTaskInput.fill(title);
    const hasAddButton = await this.addTaskButton
      .isVisible({ timeout: 500 })
      .catch(() => false);
    if (hasAddButton) {
      await this.addTaskButton.click();
    } else {
      await this.addTaskInput.press('Enter');
    }
  }

  /** Locator for a task by its visible title. */
  taskByTitle(title: string): Locator {
    return this.items.filter({ hasText: title }).first();
  }

  /**
   * Open a task's details by clicking on its title. Vikunja routes to
   * `/tasks/<id>` (or opens a details drawer overlaying the list, depending
   * on the build) — either way the title element receives the click.
   */
  async openTask(title: string): Promise<void> {
    await this.page.getByText(title, { exact: false }).first().click();
  }

  async hasTask(title: string): Promise<boolean> {
    return (await this.taskByTitle(title).count()) > 0;
  }

  async count(): Promise<number> {
    return this.items.count();
  }

  /**
   * Toggle a task's done state by clicking its row checkbox.
   *
   * Vikunja v2 keeps a native `<input type="checkbox">` in the DOM but
   * styles it invisible — the actual click target is a custom "fancy
   * checkbox" wrapper holding an `<svg class="fancy-checkbox__icon">`.
   * We target the wrapper (or its SVG) and `force:true` the click so
   * Playwright doesn't refuse on pointer-events / stacking grounds.
   *
   * The plain `input[type="checkbox"]` fallback is kept for other apps
   * that reuse this component with a stock control.
   */
  /**
   * Toggle a task's done state by clicking the checkbox label in its row.
   *
   * Vikunja v2's task rows don't carry any of the conventional
   * `task-item` / `single-task` classes our generic items locator
   * targets — they're plain `<div>`s inside a `<ul>`. So instead of
   * scoping through the row, we walk up from the task's title text to
   * the closest ancestor that owns a `.fancy-checkbox__icon`, and
   * click the label inside that ancestor. Force-click sidesteps the
   * SVG's pointer-events styling.
   */
  async markDone(title: string): Promise<void> {
    const titleEl = this.page.getByText(title, { exact: false }).first();
    const row = titleEl.locator(
      'xpath=ancestor::*[descendant::*[contains(@class, "fancy-checkbox__icon")]][1]',
    );

    const label = row.locator('label:has(.fancy-checkbox__icon)').first();
    if ((await label.count()) > 0) {
      await label.click({ force: true });
      return;
    }

    // Fallback: click the SVG directly if there's no <label> wrapping it.
    await row.locator('.fancy-checkbox__icon').first().click({ force: true });
  }
}
