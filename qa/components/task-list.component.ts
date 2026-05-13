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
   * Toggle a task's done state via its row checkbox. Vikunja v2 renders
   * a `<input type="checkbox">` next to each task title; some builds
   * use a styled control with an aria-label. Try the native input
   * first, then fall back.
   */
  async markDone(title: string): Promise<void> {
    const item = this.taskByTitle(title);
    const checkbox = item.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible({ timeout: 500 }).catch(() => false)) {
      await checkbox.check();
      return;
    }
    await item
      .locator(
        [
          '[aria-label*="done" i]',
          '[aria-label*="complete" i]',
          '.done',
          '.task-checkbox',
        ].join(', '),
      )
      .first()
      .click();
  }
}
