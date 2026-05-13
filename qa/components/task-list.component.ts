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
  async markDone(title: string): Promise<void> {
    const item = this.taskByTitle(title);
    const checkbox = item
      .locator(
        [
          '.fancy-checkbox',
          'label:has(.fancy-checkbox__icon)',
          '.fancy-checkbox__icon',
          'input[type="checkbox"]',
        ].join(', '),
      )
      .first();
    await checkbox.click({ force: true });
  }
}
