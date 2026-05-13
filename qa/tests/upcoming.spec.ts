import { test, expect } from '../fixtures';
import { UpcomingPage } from '../pages/upcoming.page';

test.describe('Sidebar → Upcoming @smoke', () => {
  test('navigating to Upcoming via the sidebar lands on the upcoming route', async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await dashboardPage.sidebar.navigateTo('Upcoming');
    await expect(page).toHaveURL(/upcoming/);
  });

  test('the upcoming page renders the shared shell (sidebar + navbar)', async ({ page }) => {
    const upcoming = new UpcomingPage(page);
    await upcoming.goto();
    expect(await upcoming.sidebar.isVisible()).toBe(true);
    expect(await upcoming.navbar.isVisible()).toBe(true);
  });
});
