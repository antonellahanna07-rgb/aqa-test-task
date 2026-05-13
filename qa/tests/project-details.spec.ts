import { test, expect } from '../fixtures';
import { ProjectFactory, TaskFactory } from '../fixtures/factories';
import { ProjectDetailsPage } from '../pages/project-details.page';
import type { Project } from '../fixtures/api-types';

/**
 * Each test seeds a fresh project via API (fast, deterministic) and
 * then exercises the project details UI. This lets the spec focus on
 * task interactions without re-testing project creation in every case.
 *
 * `useFreshProject` is a tiny helper to keep the test bodies readable
 * — it's not a fixture because each test wants a different project.
 */
async function useFreshProject(api: import('../fixtures/api-client').ApiClient): Promise<Project> {
  return api.projects.create(ProjectFactory.build());
}

test.describe('Project details — shell @smoke', () => {
  test('the project details page renders sidebar, navbar, and project title', async ({
    page,
    api,
  }) => {
    const project = await useFreshProject(api);

    const details = new ProjectDetailsPage(page, project.id);
    await details.goto();

    await expect(details.sidebar.root).toBeVisible();
    await expect(details.navbar.root).toBeVisible();
    await expect(details.projectTitleHeading).toBeVisible();
    await expect(details.projectTitleHeading).toContainText(project.title);
  });

  test('the "add a task" input is visible on a fresh project', async ({ page, api }) => {
    const project = await useFreshProject(api);
    const details = new ProjectDetailsPage(page, project.id);
    await details.goto();

    await expect(details.tasks.addTaskInput).toBeVisible();
  });
});

test.describe('Project details — task creation', () => {
  test('a user can add a task to a project via the UI', async ({ page, api }) => {
    const project = await useFreshProject(api);
    const taskTitle = TaskFactory.build().title;

    const details = new ProjectDetailsPage(page, project.id);
    await details.goto();
    await details.tasks.addTask(taskTitle);

    // UI assertion — the new task surfaces in the list.
    await expect.poll(async () => details.tasks.hasTask(taskTitle)).toBe(true);

    // API ground truth — and the server actually persisted it.
    await expect
      .poll(async () => {
        const all = await api.tasks.listForProject(project.id);
        return all.some((t) => t.title === taskTitle);
      })
      .toBe(true);
  });

  test('a user can add multiple tasks in sequence', async ({ page, api }) => {
    const project = await useFreshProject(api);
    const titles = [
      TaskFactory.build().title,
      TaskFactory.build().title,
      TaskFactory.build().title,
    ];

    const details = new ProjectDetailsPage(page, project.id);
    await details.goto();

    for (const title of titles) {
      await details.tasks.addTask(title);
      // Give Vue a beat to render before typing the next one.
      await expect.poll(async () => details.tasks.hasTask(title)).toBe(true);
    }

    // All three should be discoverable via API too.
    await expect
      .poll(async () => {
        const all = await api.tasks.listForProject(project.id);
        return titles.every((t) => all.some((task) => task.title === t));
      })
      .toBe(true);
  });

  test('an API-seeded task is rendered in the UI on first load', async ({ page, api }) => {
    // Inverse of the previous test: prove the UI reads the task list,
    // not just that it writes back what we just typed.
    const project = await useFreshProject(api);
    const task = await api.tasks.create(project.id, TaskFactory.build());

    const details = new ProjectDetailsPage(page, project.id);
    await details.goto();

    await expect(details.tasks.taskByTitle(task.title)).toBeVisible();
  });
});

test.describe('Project details — task input validation', () => {
  test('submitting an empty task title does not create anything', async ({ page, api }) => {
    const project = await useFreshProject(api);

    const details = new ProjectDetailsPage(page, project.id);
    await details.goto();

    // Press Enter on an empty input. Most Vikunja builds simply no-op.
    await details.tasks.addTaskInput.click();
    await details.tasks.addTaskInput.press('Enter');

    // Give Vikunja a beat to (mis)process the empty submit, then verify
    // nothing was persisted.
    await page.waitForTimeout(500);
    const tasks = await api.tasks.listForProject(project.id);
    expect(tasks).toHaveLength(0);
  });

  test('the API rejects an empty-title task payload', async ({ api }) => {
    // Belt-and-suspenders: even if the UI lets the empty submit through,
    // the server contract should still refuse it.
    const project = await useFreshProject(api);
    await expect(api.tasks.create(project.id, { title: '' })).rejects.toThrow(/4\d\d/);
  });
});
