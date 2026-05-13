import { test, expect } from '../fixtures';
import { ProjectFactory, TaskFactory } from '../fixtures/factories';

test.describe('API — authentication @api', () => {
  test('the API returns a JWT on valid credentials', async ({ anonApi, seededUser }) => {
    const token = await anonApi.users.login({
      username: seededUser.username,
      password: seededUser.password,
    });
    expect(token.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
  });

  test('the API rejects wrong credentials with a 4xx', async ({ anonApi, seededUser }) => {
    await expect(
      anonApi.users.login({ username: seededUser.username, password: 'wrong' }),
    ).rejects.toThrow(/4\d\d/);
  });
});

test.describe('API — projects CRUD @api', () => {
  test('full create / read / update / delete cycle', async ({ api }) => {
    // CREATE
    const payload = ProjectFactory.build();
    const created = await api.projects.create(payload);
    expect(created.id).toBeGreaterThan(0);
    expect(created.title).toBe(payload.title);

    // READ
    const fetched = await api.projects.getById(created.id);
    expect(fetched.title).toBe(payload.title);

    const list = await api.projects.list();
    expect(list.some((p) => p.id === created.id)).toBe(true);

    // UPDATE
    const renamed = `${payload.title} (renamed)`;
    const updated = await api.projects.update(created.id, { title: renamed });
    expect(updated.title).toBe(renamed);

    // DELETE
    await api.projects.remove(created.id);
    const afterDelete = await api.projects.list();
    expect(afterDelete.some((p) => p.id === created.id)).toBe(false);
  });

  test('creating a project without a title is rejected', async ({ api }) => {
    await expect(api.projects.create({ title: '' })).rejects.toThrow(/4\d\d/);
  });
});

test.describe('API — tasks under a project @api', () => {
  test('tasks can be created, listed, completed and removed', async ({ api }) => {
    const project = await api.projects.create(ProjectFactory.build());
    const task = await api.tasks.create(project.id, TaskFactory.build());

    const list = await api.tasks.listForProject(project.id);
    expect(list.map((t) => t.id)).toContain(task.id);

    await api.tasks.markDone(task.id, true);
    const afterDone = await api.tasks.listForProject(project.id);
    expect(afterDone.find((t) => t.id === task.id)?.done).toBe(true);

    await api.tasks.remove(task.id);
    const afterDelete = await api.tasks.listForProject(project.id);
    expect(afterDelete.some((t) => t.id === task.id)).toBe(false);
  });
});
