import { Locator, Page } from '@playwright/test';
import { BaseComponent } from './base.component';

/**
 * Generic "are you sure?" dialog. Vikunja v2 surfaces it for
 * destructive actions like deleting a project — the dialog asks the
 * user to confirm before the action is fired.
 *
 * The locator is permissive (matches any `[role="dialog"]` or
 * `.modal-container` whose text reads like a confirmation prompt)
 * so the same component can be reused across different destructive
 * flows without modification.
 */
export class ConfirmDialog extends BaseComponent {
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    super(
      page,
      page
        .locator('[role="dialog"], .modal-container, .modal')
        .filter({ hasText: /confirm|delete|are you sure|will be (deleted|removed)|do it/i })
        .first(),
    );
    this.confirmButton = this.root
      .getByRole('button', { name: /^\s*(do it|delete|yes|confirm|ok|remove)\s*$/i })
      .first();
    this.cancelButton = this.root
      .getByRole('button', { name: /^\s*(cancel|no)\s*$/i })
      .first();
  }

  async confirm(): Promise<void> {
    await this.waitUntilReady();
    await this.confirmButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }
}
