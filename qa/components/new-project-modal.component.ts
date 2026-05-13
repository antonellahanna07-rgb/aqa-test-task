import { Locator, Page } from '@playwright/test';
import { BaseComponent } from './base.component';

export interface NewProjectValues {
  title: string;
  description?: string;
}

/**
 * Modal that appears after clicking the "New project" affordance.
 *
 * Designed as its own component because the same modal might be reachable
 * from multiple entry points in the future (sidebar `+`, page-level
 * button, keyboard shortcut). The component encapsulates "how to fill
 * and submit the form" so every entry point reuses the same contract.
 */
export class NewProjectModal extends BaseComponent {
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    super(
      page,
      page
        .locator('.modal, [role="dialog"], [data-cy="project-modal"], .project-create')
        .filter({ has: page.getByRole('button', { name: /create|save/i }) })
        .first(),
    );
    this.titleInput = this.root
      .getByRole('textbox', { name: /^\s*(title|name)\s*$/i })
      .or(this.root.getByPlaceholder(/title|name/i))
      .first();
    this.descriptionInput = this.root
      .getByRole('textbox', { name: /description/i })
      .or(this.root.getByPlaceholder(/description/i))
      .first();
    this.submitButton = this.root.getByRole('button', { name: /create|save/i }).first();
    this.cancelButton = this.root.getByRole('button', { name: /cancel|close/i }).first();
  }

  /** Fill the form without submitting. */
  async fillForm(values: NewProjectValues): Promise<void> {
    await this.titleInput.fill(values.title);
    if (values.description !== undefined) {
      // The description field is optional on some Vikunja screens — fall
      // through silently if it's not rendered.
      await this.descriptionInput.fill(values.description).catch(() => {
        /* no-op */
      });
    }
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  /** Convenience: fill + submit + wait for the modal to detach. */
  async createProject(values: NewProjectValues): Promise<void> {
    await this.waitUntilReady();
    await this.fillForm(values);
    await this.submit();
    await this.root.waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {
      /* modal may animate out — best-effort wait */
    });
  }

  /** Touch the title field and clear it so blur-based validation fires. */
  async clearTitle(): Promise<void> {
    await this.titleInput.click();
    await this.titleInput.press('ControlOrMeta+A');
    await this.titleInput.press('Backspace');
    await this.titleInput.blur();
  }
}
