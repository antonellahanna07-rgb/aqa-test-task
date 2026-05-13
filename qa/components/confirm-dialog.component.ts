import { Locator, Page } from '@playwright/test';
import { BaseComponent } from './base.component';

export class ConfirmDialog extends BaseComponent {
  private readonly confirmBtn: Locator;
  private readonly cancelBtn: Locator;

  constructor(page: Page) {
    super(
      page,
      page
        .locator('[role="dialog"], .modal')
        .filter({ hasText: /confirm|delete|are you sure/i })
        .first(),
    );
    this.confirmBtn = this.root.getByRole('button', { name: /(do it|delete|yes|confirm|ok)/i });
    this.cancelBtn = this.root.getByRole('button', { name: /cancel|no/i });
  }

  async confirm(): Promise<void> {
    await this.waitUntilReady();
    await this.confirmBtn.click();
  }

  async cancel(): Promise<void> {
    await this.cancelBtn.click();
  }
}
