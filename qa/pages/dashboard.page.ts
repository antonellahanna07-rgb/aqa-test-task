import { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { Sidebar } from '../components/sidebar.component';
import { NavBar } from '../components/nav-bar.component';

/**
 * Authenticated home/dashboard. Note the composition: Dashboard *has-a*
 * Sidebar and NavBar — it does not *is-a* them. The same components could
 * be reused on any future authenticated page with no duplication.
 */
export class DashboardPage extends BasePage {
  protected readonly path = '/';
  readonly sidebar: Sidebar;
  readonly navbar: NavBar;

  constructor(page: Page) {
    super(page);
    this.sidebar = new Sidebar(page);
    this.navbar = new NavBar(page);
  }

  async waitUntilLoaded(): Promise<void> {
    await this.sidebar.waitUntilReady();
  }
}
