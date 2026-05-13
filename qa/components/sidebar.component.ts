import { Page } from '@playwright/test';
import { BaseComponent } from './base.component';

/**
 * Left sidebar shown on every authenticated page. The scope of this
 * submission only needs the visibility contract — future work (project
 * lists, favorites, navigation) layers on without modifying this class.
 */
export class Sidebar extends BaseComponent {
  constructor(page: Page) {
    super(page, page.locator('aside, nav.menu, [data-cy="sidebar"]').first());
  }
}
