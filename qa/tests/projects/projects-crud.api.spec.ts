import { test, expect } from '../../src/fixtures';
import { ProjectFactory } from '../../src/factories/ProjectFactory';

test.describe('Projects CRUD via API @api', () => {
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
