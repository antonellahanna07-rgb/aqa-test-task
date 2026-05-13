import { Page } from '@playwright/test';
import { BasePage } from './base.page';
import { Sidebar } from '../components/sidebar.component';
import { NavBar } from '../components/nav-bar.component';

/**
 * Common shell shared by every authenticated screen — the Sidebar on the
 * left, the NavBar (Search / Notifications / Account / Hamburger) on top.
 * Subclasses only need to supply their own `path` and a `waitUntilLoaded`
 * implementation that recognises page-specific content.
 *
 * This is Open/Closed in action: when Vikunja adds another menu page,
 * we extend this class; we don't reach into Sidebar or NavBar.
 */
export abstract class AuthenticatedPage extends BasePage {
  readonly sidebar: Sidebar;
  readonly navbar: NavBar;

  protected constructor(page: Page) {
    super(page);
    this.sidebar = new Sidebar(page);
    this.navbar = new NavBar(page);
  }

  /**
   * Default readiness check: the sidebar is visible. Subclasses can
   * override to wait on page-specific content (e.g. a header).
   */
  async waitUntilLoaded(): Promise<void> {
    await this.sidebar.waitUntilReady();
  }
}
