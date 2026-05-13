import { test, expect } from '../fixtures';
import { ProjectFactory, TaskFactory } from '../fixtures/factories';
import { ProjectPage } from '../pages/project.page';

test.describe('Projects — UI CRUD', () => {
  test('user can create a project from the sidebar and see it in the list', async ({
    dashboardPage,
  }) => {
    const data = ProjectFactory.build();

    await dashboardPage.goto();
    await dashboardPage.createProjectFromSidebar(data.title, data.description);

    await expect.poll(async () => dashboardPage.sidebar.hasProject(data.title)).toBe(true);
  });

  test(
    'user can rename a project (mixed: API seed → UI rename → API verify)',
    async ({ page, api }) => {
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

  test('user can delete a project from the project page', async ({ page, api }) => {
    const seeded = await api.projects.create(ProjectFactory.build());

    const projectPage = new ProjectPage(page, seeded.id);
    await projectPage.goto();
    await projectPage.deleteProject();

    await expect
      .poll(async () => (await api.projects.list()).some((p) => p.id === seeded.id))
      .toBe(false);
  });
});

test.describe('Projects — combined UI/API task flows', () => {
  test('a task created via the UI is visible via the API @smoke', async ({ page, api }) => {
    const project = await api.projects.create(ProjectFactory.build());
    const task = TaskFactory.build();

    const projectPage = new ProjectPage(page, project.id);
    await projectPage.goto();
    await projectPage.tasks.addTask(task.title);

    await expect
      .poll(async () => (await api.tasks.listForProject(project.id)).map((t) => t.title))
      .toContain(task.title);
  });

  test('a task created via the API is rendered in the UI', async ({ page, api }) => {
    const project = await api.projects.create(ProjectFactory.build());
    const task = await api.tasks.create(project.id, TaskFactory.build());

    const projectPage = new ProjectPage(page, project.id);
    await projectPage.goto();

    await expect.poll(async () => projectPage.tasks.hasTask(task.title)).toBe(true);
  });

  test('marking a task done via the UI is persisted in the API', async ({ page, api }) => {
    const project = await api.projects.create(ProjectFactory.build());
    const task = await api.tasks.create(project.id, TaskFactory.build());

    const projectPage = new ProjectPage(page, project.id);
    await projectPage.goto();
    await projectPage.tasks.toggleDone(task.title);

    await expect
      .poll(async () => {
        const tasks = await api.tasks.listForProject(project.id);
        return tasks.find((t) => t.id === task.id)?.done;
      })
      .toBe(true);
  });
});
