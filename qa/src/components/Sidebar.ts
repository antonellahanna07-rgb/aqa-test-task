import { Locator, Page } from '@playwright/test';
import { BaseComponent } from './BaseComponent';

/**
 * Left sidebar listing projects/favorites. Reused on every authenticated
 * page (Dashboard, Project detail, Settings, …).
 */
export class Sidebar extends BaseComponent {
  private readonly newProjectBtn: Locator;
  private readonly projectItems: Locator;

  constructor(page: Page) {
    super(page, page.locator('aside, nav.menu, [data-cy="sidebar"]').first());
    this.newProjectBtn = this.root.locator(
      '[data-cy="new-project"], button[title*="New project" i], a:has-text("New project")',
    ).first();
    this.projectItems = this.root.locator('[data-cy="project-item"], a.project, li.project');
  }

  async openNewProjectModal(): Promise<void> {
    await this.newProjectBtn.click();
  }

  projectLink(title: string): Locator {
    return this.root.getByRole('link', { name: title, exact: false }).first();
  }

  async openProject(title: string): Promise<void> {
    await this.projectLink(title).click();
  }

  async listProjectTitles(): Promise<string[]> {
    const count = await this.projectItems.count();
    const out: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = (await this.projectItems.nth(i).innerText()).trim();
      if (text) out.push(text);
    }
    return out;
  }

  async hasProject(title: string): Promise<boolean> {
    return (await this.projectLink(title).count()) > 0;
  }
}
