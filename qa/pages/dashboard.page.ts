import { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { Sidebar } from '../components/sidebar.component';
import { NavBar } from '../components/nav-bar.component';
import { ProjectFormModal } from '../components/project-form.modal';

/**
 * Authenticated home/dashboard. Note the composition: Dashboard *has-a*
 * Sidebar and NavBar — it does not *is-a* them. The same Sidebar instance
 * type is reused on ProjectPage with no duplication.
 */
export class DashboardPage extends BasePage {
  protected readonly path = '/';
  readonly sidebar: Sidebar;
  readonly navbar: NavBar;
  readonly projectModal: ProjectFormModal;

  constructor(page: Page) {
    super(page);
    this.sidebar = new Sidebar(page);
    this.navbar = new NavBar(page);
    this.projectModal = new ProjectFormModal(page);
  }

  async waitUntilLoaded(): Promise<void> {
    await this.sidebar.waitUntilReady();
  }

  async createProjectFromSidebar(title: string, description?: string): Promise<void> {
    await this.sidebar.openNewProjectModal();
    await this.projectModal.createProject({ title, description });
  }
}
