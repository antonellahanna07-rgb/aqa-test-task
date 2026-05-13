import { test, expect } from '../fixtures';
import { ProjectFactory } from '../fixtures/factories';
import { ProjectsPage } from '../pages/projects.page';

test.describe('Sidebar → Projects @smoke', () => {
  test('navigating to Projects via the sidebar lands on the projects route', async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await dashboardPage.sidebar.navigateTo('Projects');
    await expect(page).toHaveURL(/\/projects/);
  });

  test('the projects page renders the shared shell (sidebar + navbar)', async ({ page }) => {
    const projects = new ProjectsPage(page);
    await projects.goto();
    expect(await projects.sidebar.isVisible()).toBe(true);
    expect(await projects.navbar.isVisible()).toBe(true);
  });
});

test.describe('Projects — new-project trigger @smoke', () => {
  test('the "new project" trigger is visible and clickable', async ({ page }) => {
    const projects = new ProjectsPage(page);
    await projects.goto();
    await expect(projects.newProjectButton).toBeVisible();
    await expect(projects.newProjectButton).toBeEnabled();
  });

  test('clicking the "new project" trigger opens the creation modal', async ({ page }) => {
    const projects = new ProjectsPage(page);
    await projects.goto();
    await projects.openNewProjectModal();
    await expect(projects.modal.root).toBeVisible();
    await expect(projects.modal.titleInput).toBeVisible();
    await expect(projects.modal.submitButton).toBeVisible();
  });
});

test.describe('Projects — create via UI', () => {
  test('a user can create a new project and see it in the list', async ({ page, api }) => {
    const data = ProjectFactory.build();

    const projects = new ProjectsPage(page);
    await projects.goto();
    await projects.createProject({ title: data.title, description: data.description });

    // UI assertion — the project appears somewhere on the page (sidebar
    // list, projects list, or wherever Vikunja chooses to render it).
    await expect.poll(async () => projects.hasProject(data.title)).toBe(true);

    // API assertion — and the project actually persisted server-side.
    await expect.poll(async () => (await api.projects.findByTitle(data.title))?.title).toBe(
      data.title,
    );
  });

  test('a user can create multiple projects in sequence', async ({ page, api }) => {
    const titles = [
      ProjectFactory.build().title,
      ProjectFactory.build().title,
      ProjectFactory.build().title,
    ];

    const projects = new ProjectsPage(page);
    await projects.goto();

    for (const title of titles) {
      await projects.createProject({ title });
    }

    // All three should be discoverable via the API.
    await expect
      .poll(async () => {
        const all = await api.projects.list();
        return titles.every((t) => all.some((p) => p.title === t));
      })
      .toBe(true);

    // And all three should be visible on the projects page.
    for (const title of titles) {
      await expect.poll(async () => projects.hasProject(title)).toBe(true);
    }
  });
});

test.describe('Projects — new-project input validation', () => {
  test('the modal submit is disabled when the title is empty', async ({ page }) => {
    const projects = new ProjectsPage(page);
    await projects.goto();
    await projects.openNewProjectModal();

    // Title hasn't been touched — the modal opens with an empty title
    // and the submit should be gated until the user types something.
    await expect(projects.modal.submitButton).toBeDisabled();
  });

  test('typing a title enables submit; clearing it disables submit again', async ({ page }) => {
    const projects = new ProjectsPage(page);
    await projects.goto();
    await projects.openNewProjectModal();

    await projects.modal.titleInput.fill('Validation test title');
    await expect(projects.modal.submitButton).toBeEnabled();

    await projects.modal.clearTitle();
    await expect(projects.modal.submitButton).toBeDisabled();
  });

  test('cancelling the modal does not create a project', async ({ page, api }) => {
    const ghostTitle = ProjectFactory.build().title;
    const projects = new ProjectsPage(page);
    await projects.goto();
    await projects.openNewProjectModal();
    await projects.modal.fillForm({ title: ghostTitle });
    await projects.modal.cancel();

    // Give Vikunja a beat to settle, then verify nothing was created.
    await page.waitForTimeout(500);
    const found = await api.projects.findByTitle(ghostTitle);
    expect(found).toBeUndefined();
  });

  test('the API rejects an empty-title project payload', async ({ api }) => {
    // Belt-and-suspenders: even if the UI gating regresses, the server
    // contract should still reject an empty title.
    await expect(api.projects.create({ title: '' })).rejects.toThrow(/4\d\d/);
  });
});
