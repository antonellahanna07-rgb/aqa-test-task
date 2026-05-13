import { Locator, Page } from '@playwright/test';
import { BaseComponent } from './BaseComponent';

/**
 * Task list panel embedded inside a project page. Decoupled from the project
 * page itself so it can be reused in dashboards, search results, or filter
 * views without duplication.
 */
export class TaskList extends BaseComponent {
  private readonly newTaskInput: Locator;
  private readonly addTaskBtn: Locator;
  private readonly items: Locator;

  constructor(page: Page, root?: Locator) {
    super(page, root ?? page.locator('.tasks, [data-cy="task-list"]').first());
    this.newTaskInput = this.root.getByPlaceholder(/add a (new )?task/i).first();
    this.addTaskBtn = this.root.getByRole('button', { name: /add task/i });
    this.items = this.root.locator('[data-cy="task-item"], .task, li.task-item');
  }

  async addTask(title: string): Promise<void> {
    await this.newTaskInput.fill(title);
    if (await this.addTaskBtn.isVisible().catch(() => false)) {
      await this.addTaskBtn.click();
    } else {
      await this.newTaskInput.press('Enter');
    }
  }

  taskItem(title: string): Locator {
    return this.items.filter({ hasText: title }).first();
  }

  async hasTask(title: string): Promise<boolean> {
    return (await this.taskItem(title).count()) > 0;
  }

  async toggleDone(title: string): Promise<void> {
    const item = this.taskItem(title);
    await item.locator('input[type="checkbox"]').first().click();
  }

  async count(): Promise<number> {
    return this.items.count();
  }
}
