import { test, expect } from '../../src/fixtures';
import { ProjectFactory } from '../../src/factories/ProjectFactory';
import { TaskFactory } from '../../src/factories/TaskFactory';
import { ProjectPage } from '../../src/pages/ProjectPage';

test.describe('Tasks — UI/API combined flows', () => {
  test('a task created via the UI is visible via the API @smoke', async ({
    page,
    api,
  }) => {
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
