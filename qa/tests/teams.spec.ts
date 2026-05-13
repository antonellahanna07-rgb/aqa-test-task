import { test, expect } from '../fixtures';
import { TeamsPage } from '../pages/teams.page';

test.describe('Sidebar → Teams @smoke', () => {
  test('navigating to Teams via the sidebar lands on the teams route', async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await dashboardPage.sidebar.navigateTo('Teams');
    await expect(page).toHaveURL(/\/teams/);
  });

  test('the teams page renders the shared shell (sidebar + navbar)', async ({ page }) => {
    const teams = new TeamsPage(page);
    await teams.goto();
    expect(await teams.sidebar.isVisible()).toBe(true);
    expect(await teams.navbar.isVisible()).toBe(true);
  });
});
