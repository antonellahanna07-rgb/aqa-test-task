import { Page } from '@playwright/test';
import { BaseComponent } from './base.component';

/**
 * Left sidebar shown on every authenticated page.
 *
 * The selector is intentionally permissive because Vikunja's frontend
 * has shipped a few different DOM layouts across versions. The first
 * matching variant wins; future cleanup is a single-line change.
 */
export class Sidebar extends BaseComponent {
  constructor(page: Page) {
    super(
      page,
      page
        .locator(
          [
            '[data-cy="sidebar"]',
            'aside.namespace-container',
            'aside.menu',
            '.namespace-container',
            '.menu-container',
            'nav.menu',
            '#menu',
            'aside[role="navigation"]',
            'aside',
          ].join(', '),
        )
        .first(),
    );
  }
}
