import { test, expect } from '../fixtures';
import { InboxPage } from '../pages/inbox.page';

test.describe('Sidebar → Inbox @smoke', () => {
  test('navigating to Inbox via the sidebar lands on the inbox project', async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await dashboardPage.sidebar.navigateTo('Inbox');

    // Vikunja v2's Inbox is a per-user special project — its id is not
    // a magic `-1`, it's whatever Vikunja assigned for this user
    // (route shape: `/projects/<id>/<viewId>`). So we assert the URL is
    // some project page AND that the page identifies itself as the
    // Inbox via its title heading.
    await expect(page).toHaveURL(/\/projects\/\d+/);
    await expect(page.getByRole('heading', { name: /^\s*inbox\s*$/i }).first()).toBeVisible();
  });

  test('the inbox page renders the shared shell (sidebar + navbar)', async ({ page }) => {
    const inbox = new InboxPage(page);
    await inbox.goto();
    expect(await inbox.sidebar.isVisible()).toBe(true);
    expect(await inbox.navbar.isVisible()).toBe(true);
  });
});
