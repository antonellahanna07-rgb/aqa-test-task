import { test, expect } from '../fixtures';
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
