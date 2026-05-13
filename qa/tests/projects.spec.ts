import { test, expect } from '../fixtures';
import { ProjectFactory } from '../fixtures/factories';
import { ProjectsPage } from '../pages/projects.page';
import { ProjectDetailsPage } from '../pages/project-details.page';

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
  test('creating a project lands on its details page and persists in the API', async ({
    page,
    api,
  }) => {
    const data = ProjectFactory.build();

    const projects = new ProjectsPage(page);
    await projects.goto();
    await projects.createProject({ title: data.title });

    // Vikunja v2 auto-navigates to the new project's details page after
    // creation — confirm via URL pattern.
    await expect(page).toHaveURL(/\/projects\/\d+/);

    // The shared shell still renders on the details page, and the title
    // heading reflects the project we just created.
    const details = new ProjectDetailsPage(page);
    await details.waitUntilLoaded();
    await expect(details.projectTitleHeading).toContainText(data.title);

    // API ground truth — and the project was actually persisted.
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
      // After creation Vikunja lands on /projects/<id>. To open another
      // creation modal we have to return to the list — click "Projects"
      // in the sidebar.
      await projects.sidebar.navigateTo('Projects');
      await projects.waitUntilLoaded();
    }

    // All three should be discoverable via API.
    await expect
      .poll(async () => {
        const all = await api.projects.list();
        return titles.every((t) => all.some((p) => p.title === t));
      })
      .toBe(true);
  });
});

test.describe('Project details — shell + items visible @smoke', () => {
  test('after creation, the project details page shows sidebar, navbar, and title', async ({
    page,
    api,
  }) => {
    // Seed the project via API so this test focuses on the details-page
    // contract, not the creation modal.
    const seeded = await api.projects.create(ProjectFactory.build());

    const details = new ProjectDetailsPage(page, seeded.id);
    await details.goto();

    await expect(details.sidebar.root).toBeVisible();
    await expect(details.navbar.root).toBeVisible();
    await expect(details.projectTitleHeading).toBeVisible();
    await expect(details.projectTitleHeading).toContainText(seeded.title);
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
