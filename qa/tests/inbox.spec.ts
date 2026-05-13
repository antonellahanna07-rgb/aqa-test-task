import { test, expect } from '../fixtures';
import { InboxPage } from '../pages/inbox.page';

test.describe('Sidebar → Inbox @smoke', () => {
  test('navigating to Inbox via the sidebar lands on the inbox route', async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await dashboardPage.sidebar.navigateTo('Inbox');
    // Vikunja's Inbox is rendered as the special pinned project `-1`,
    // but some builds expose it at `/inbox`. Accept either.
    await expect(page).toHaveURL(/\/(inbox|projects\/-1)/);
  });

  test('the inbox page renders the shared shell (sidebar + navbar)', async ({ page }) => {
    const inbox = new InboxPage(page);
    await inbox.goto();
    expect(await inbox.sidebar.isVisible()).toBe(true);
    expect(await inbox.navbar.isVisible()).toBe(true);
  });
});
