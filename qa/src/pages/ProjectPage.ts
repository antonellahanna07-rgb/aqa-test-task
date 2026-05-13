import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { Sidebar } from '../components/Sidebar';
import { NavBar } from '../components/NavBar';
import { TaskList } from '../components/TaskList';
import { ConfirmDialog } from '../components/ConfirmDialog';

export class ProjectPage extends BasePage {
  protected readonly path: string;
  readonly sidebar: Sidebar;
  readonly navbar: NavBar;
  readonly tasks: TaskList;
  readonly confirmDialog: ConfirmDialog;

  private readonly title: Locator;
  private readonly editTitleInput: Locator;
  private readonly settingsBtn: Locator;
  private readonly deleteMenuItem: Locator;

  constructor(page: Page, projectId: number) {
    super(page);
    this.path = `/projects/${projectId}`;
    this.sidebar = new Sidebar(page);
    this.navbar = new NavBar(page);
    this.tasks = new TaskList(page);
    this.confirmDialog = new ConfirmDialog(page);

    this.title = page.locator('h1, h2').first();
    this.editTitleInput = page.locator('input[name="title"], h1 input').first();
    this.settingsBtn = page.locator('[data-cy="project-settings"], button[aria-label*="settings" i]').first();
    this.deleteMenuItem = page.getByRole('menuitem', { name: /delete/i });
  }

  async waitUntilLoaded(): Promise<void> {
    await this.title.waitFor({ state: 'visible' });
  }

  async readTitle(): Promise<string> {
    return (await this.title.innerText()).trim();
  }

  async rename(newTitle: string): Promise<void> {
    await this.title.click();
    await this.editTitleInput.fill(newTitle);
    await this.editTitleInput.press('Enter');
  }

  async deleteProject(): Promise<void> {
    await this.settingsBtn.click();
    await this.deleteMenuItem.click();
    await this.confirmDialog.confirm();
  }
}
