import { Locator, Page } from '@playwright/test';
import { BaseComponent } from './BaseComponent';

export interface ProjectFormValues {
  title: string;
  description?: string;
  hexColor?: string;
}

export class ProjectFormModal extends BaseComponent {
  private readonly titleInput: Locator;
  private readonly descriptionInput: Locator;
  private readonly submitBtn: Locator;
  private readonly cancelBtn: Locator;

  constructor(page: Page) {
    super(page, page.locator('.modal, [role="dialog"], [data-cy="project-modal"]').first());
    this.titleInput = this.root.getByPlaceholder(/title|name/i).first();
    this.descriptionInput = this.root.getByPlaceholder(/description/i).first();
    this.submitBtn = this.root.getByRole('button', { name: /create|save/i });
    this.cancelBtn = this.root.getByRole('button', { name: /cancel|close/i });
  }

  async fill(values: ProjectFormValues): Promise<void> {
    await this.titleInput.fill(values.title);
    if (values.description !== undefined) {
      await this.descriptionInput.fill(values.description).catch(() => {
        /* description field is optional in some screens */
      });
    }
  }

  async submit(): Promise<void> {
    await this.submitBtn.click();
  }

  async cancel(): Promise<void> {
    await this.cancelBtn.click();
  }

  async createProject(values: ProjectFormValues): Promise<void> {
    await this.waitUntilReady();
    await this.fill(values);
    await this.submit();
    await this.root.waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {
      /* the modal may animate out, that's fine */
    });
  }
}
