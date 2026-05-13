import { Locator, Page } from '@playwright/test';
import { BaseComponent } from './base.component';

export interface NewProjectValues {
  title: string;
  /**
   * Vikunja v2's new-project modal only renders Title, Parent Project,
   * and Color — there's no description field at creation time. Kept on
   * the interface for forward compatibility; ignored if the field isn't
   * present.
   */
  description?: string;
}

/**
 * The "New project" dialog. Vikunja v2 renders it inside a
 * `<div class="modal-container">` containing a `.card` with a
 * `.card-header-title` of "New project" and a `.card-footer` with
 * "Cancel" / "Create" buttons. The Create button is `disabled` until
 * the title input has content.
 */
export class NewProjectModal extends BaseComponent {
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    // Scope to the modal-container that holds a card titled "New project"
    // so we don't accidentally grab a different open modal (e.g. an
    // unrelated confirmation dialog).
    super(
      page,
      page
        .locator('.modal-container')
        .filter({ has: page.locator('.card-header-title', { hasText: /new\s*project/i }) })
        .first(),
    );
    this.titleInput = this.root.locator('input[name="projectTitle"]').first();
    // Description field doesn't exist on v2's modal — keep the locator
    // permissive so callers don't have to special-case it; fillForm()
    // silently no-ops if it's not visible.
    this.descriptionInput = this.root
      .getByRole('textbox', { name: /description/i })
      .or(this.root.getByPlaceholder(/description/i))
      .first();
    // The footer's Create button has visible "Create" text. The card
    // header has a Close (✕) button labelled "Close" — distinct name, no
    // collision with /create/i.
    this.submitButton = this.root.getByRole('button', { name: /^\s*create\s*$/i }).first();
    this.cancelButton = this.root.getByRole('button', { name: /^\s*cancel\s*$/i }).first();
  }

  async fillForm(values: NewProjectValues): Promise<void> {
    await this.titleInput.fill(values.title);
    if (values.description !== undefined) {
      // Short-circuit the description fill if the field isn't on screen
      // — otherwise Playwright waits the full action timeout (15s) on a
      // locator that will never resolve. v2 doesn't render a description
      // input in the new-project modal at all.
      const hasDescription = await this.descriptionInput
        .isVisible({ timeout: 500 })
        .catch(() => false);
      if (hasDescription) {
        await this.descriptionInput.fill(values.description);
      }
    }
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  async createProject(values: NewProjectValues): Promise<void> {
    await this.waitUntilReady();
    await this.fillForm(values);
    await this.submit();
    await this.root.waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {
      /* modal animates out — best-effort wait */
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
