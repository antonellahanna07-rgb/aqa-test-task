import { test, expect } from '../../src/fixtures';
import { ProjectFactory } from '../../src/factories/ProjectFactory';
import { ProjectPage } from '../../src/pages/ProjectPage';

test.describe('Projects CRUD via UI', () => {
  test('user can create a project from the sidebar and see it in the list', async ({
    page,
    dashboardPage,
  }) => {
    const data = ProjectFactory.build();

    await dashboardPage.goto();
    await dashboardPage.createProjectFromSidebar(data.title, data.description);

    await expect.poll(async () => dashboardPage.sidebar.hasProject(data.title)).toBe(true);
  });

  test(
    'user can rename a project they created (mixed: API seed + UI rename + API verify)',
    async ({ page, api, dashboardPage }) => {
      // ⚡ API seed — bypass UI to skip ~10s of slow project creation through the form.
      const seeded = await api.projects.create(ProjectFactory.build());
      const newTitle = `${seeded.title} ✏`;

      // UI flow under test
      const projectPage = new ProjectPage(page, seeded.id);
      await projectPage.goto();
      await projectPage.rename(newTitle);

      // 🔎 API verify — fast and immune to UI rendering races.
      await expect.poll(async () => (await api.projects.getById(seeded.id)).title).toBe(newTitle);
    },
  );

  test('user can delete a project from the project page', async ({
    page,
    api,
    dashboardPage,
  }) => {
    const seeded = await api.projects.create(ProjectFactory.build());

    const projectPage = new ProjectPage(page, seeded.id);
    await projectPage.goto();
    await projectPage.deleteProject();

    await expect
      .poll(async () => (await api.projects.list()).some((p) => p.id === seeded.id))
      .toBe(false);
  });
});
