import { test, expect } from '../fixtures';
import { OverviewPage } from '../pages/overview.page';

test.describe('Sidebar → Overview @smoke', () => {
  test('navigating to Overview via the sidebar lands on the overview route', async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await dashboardPage.sidebar.navigateTo('Overview');
    await expect(page).toHaveURL(/\/$|\/overview/);
  });

  test('the overview page renders the shared shell (sidebar + navbar)', async ({ page }) => {
    const overview = new OverviewPage(page);
    await overview.goto();
    expect(await overview.sidebar.isVisible()).toBe(true);
    expect(await overview.navbar.isVisible()).toBe(true);
  });
});
