import { test, expect } from '../fixtures';
import { LabelsPage } from '../pages/labels.page';

test.describe('Sidebar → Labels @smoke', () => {
  test('navigating to Labels via the sidebar lands on the labels route', async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await dashboardPage.sidebar.navigateTo('Labels');
    await expect(page).toHaveURL(/\/labels/);
  });

  test('the labels page renders the shared shell (sidebar + navbar)', async ({ page }) => {
    const labels = new LabelsPage(page);
    await labels.goto();
    expect(await labels.sidebar.isVisible()).toBe(true);
    expect(await labels.navbar.isVisible()).toBe(true);
  });
});
