import { test, expect } from '../fixtures';
import { ProjectFactory, TaskFactory } from '../fixtures/factories';
import { ProjectDetailsPage } from '../pages/project-details.page';
import { ProjectsPage } from '../pages/projects.page';
import { TaskDetailsPage } from '../pages/task-details.page';
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

  test('a user can open a task and mark it as done from the details page', async ({
    page,
    api,
  }) => {
    const project = await useFreshProject(api);
    const task = await api.tasks.create(project.id, TaskFactory.build());

    // Step 1: from the project page, click the task's title to open
    // its details surface.
    const projectDetails = new ProjectDetailsPage(page, project.id);
    await projectDetails.goto();
    await projectDetails.tasks.openTask(task.title);

    // Step 2: on the task details page, hit "Mark as done".
    const taskDetails = new TaskDetailsPage(page);
    await taskDetails.waitUntilLoaded();
    await taskDetails.markAsDoneButton.click();

    // API ground truth: the toggle actually persisted server-side.
    await expect
      .poll(async () => {
        const all = await api.tasks.listForProject(project.id);
        return all.find((t) => t.id === task.id)?.done;
      })
      .toBe(true);
  });
});

test.describe('Project details — views render seeded tasks', () => {
  // Parameterized over the two non-default views the user asked us to
  // cover. The default (List) is already exercised in the task-creation
  // describe above; Gantt is intentionally skipped because it shows
  // tasks on a timeline rather than a textual surface that's easy to
  // assert on.
  for (const view of ['Table', 'Kanban'] as const) {
    test(`an API-seeded task is visible in the ${view} view`, async ({ page, api }) => {
      const project = await api.projects.create(ProjectFactory.build());
      const task = await api.tasks.create(project.id, TaskFactory.build());

      const details = new ProjectDetailsPage(page, project.id);
      await details.goto();
      await details.views.switchTo(view);

      // Whichever DOM shape the view chooses (table row / kanban card),
      // the task title text should land somewhere visible on the page.
      await expect(page.getByText(task.title, { exact: false }).first()).toBeVisible();
    });
  }
});

test.describe('Project details — done state reflected in views', () => {
  // Mark the task done via API (fast, deterministic), then assert that
  // the corresponding view actually surfaces the done state. The "done
  // indicator" check is intentionally permissive — Vikunja v2 may
  // signal done-ness via a class, an aria-checked attribute, or a
  // checked checkbox depending on the view.
  for (const view of ['Table', 'Kanban'] as const) {
    test(`a task marked done is visible AND shows a done cue in the ${view} view`, async ({
      page,
      api,
    }) => {
      const project = await api.projects.create(ProjectFactory.build());
      const task = await api.tasks.create(project.id, TaskFactory.build());
      await api.tasks.markDone(task.id, true);

      const details = new ProjectDetailsPage(page, project.id);
      await details.goto();
      await details.views.switchTo(view);

      // 1. Task is still rendered.
      const taskCue = page.getByText(task.title, { exact: false }).first();
      await expect(taskCue).toBeVisible();

      // 2. Climb to the row/card containing the title and look for any
      //    done-flavored cue inside it. Covers the common patterns
      //    Vikunja uses: a class with "done"/"complete" in it, an
      //    aria-checked attribute, or a checked checkbox.
      const container = taskCue.locator(
        'xpath=ancestor::*[self::tr or self::li or self::div][1]',
      );
      const doneIndicator = container
        .locator(
          [
            '[class*="done" i]',
            '[class*="complete" i]',
            '.is-done',
            '[aria-checked="true"]',
            'input[type="checkbox"]:checked',
          ].join(', '),
        )
        .first();
      await expect(doneIndicator).toBeVisible();
    });
  }
});

test.describe('Project details — edit and delete the project', () => {
  test('editing a project title is reflected on the details page, /projects, and the API', async ({
    page,
    api,
  }) => {
    const project = await useFreshProject(api);
    const newTitle = `${project.title} (edited)`;

    const details = new ProjectDetailsPage(page, project.id);
    await details.goto();
    await details.actionsMenu.clickAction('Edit');

    // Vikunja v2's edit modal uses `<input id="title">` (no `name`
    // attribute), while the new-project modal uses `name="projectTitle"`.
    // Both expose a proper <label for="…">Title</label> association,
    // so getByLabel is the one selector that works for either surface.
    const titleInput = page.getByLabel(/^\s*title\s*$/i).first();
    await titleInput.waitFor({ state: 'visible' });
    await titleInput.fill(newTitle);

    await page.getByRole('button', { name: /^\s*(save|update)\s*$/i }).first().click();

    // API ground truth: the rename actually persisted.
    await expect.poll(async () => (await api.projects.getById(project.id)).title).toBe(newTitle);

    // UI: the project details page now shows the new title in its
    // heading (proves the SPA picked up the change in place).
    await expect(details.projectTitleHeading).toContainText(newTitle);

    // UI: the new title also surfaces on the projects list.
    const projects = new ProjectsPage(page);
    await projects.goto();
    await expect.poll(async () => projects.hasProject(newTitle)).toBe(true);
  });

  test('deleting a project removes it from /projects and from the API', async ({
    page,
    api,
  }) => {
    const project = await useFreshProject(api);

    const details = new ProjectDetailsPage(page, project.id);
    await details.goto();
    await details.actionsMenu.clickAction('Delete');

    // Vikunja asks the user to confirm — accept.
    await details.confirmDialog.confirm();

    // API ground truth: the project is gone.
    await expect
      .poll(async () => {
        const all = await api.projects.list();
        return all.some((p) => p.id === project.id);
      })
      .toBe(false);

    // UI: the project is no longer rendered on the projects list.
    const projects = new ProjectsPage(page);
    await projects.goto();
    await expect.poll(async () => projects.hasProject(project.title)).toBe(false);
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
