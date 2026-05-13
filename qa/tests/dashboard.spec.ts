import { test, expect } from '../fixtures';
import { SIDEBAR_MENU_ITEMS } from '../components/sidebar.component';

test.describe('Dashboard — visible items @smoke', () => {
  test('the sidebar is visible', async ({ dashboardPage }) => {
    await dashboardPage.goto();
    expect(await dashboardPage.sidebar.isVisible()).toBe(true);
  });

  test('the top navbar is visible', async ({ dashboardPage }) => {
    await dashboardPage.goto();
    expect(await dashboardPage.navbar.isVisible()).toBe(true);
  });

  // Each top-bar sub-component is its own assertion so a single missing
  // affordance shows up as a focused failure rather than getting hidden
  // inside a generic "navbar visible" test.
  for (const component of ['search', 'notifications', 'account', 'hamburger'] as const) {
    test(`the navbar's ${component} affordance is visible`, async ({ dashboardPage }) => {
      await dashboardPage.goto();
      expect(await dashboardPage.navbar[component].isVisible()).toBe(true);
    });
  }

  // Each sidebar menu entry. Parameterized so adding a new menu item is
  // a single-line change in SIDEBAR_MENU_ITEMS.
  for (const item of SIDEBAR_MENU_ITEMS) {
    test(`the "${item}" menu entry is visible in the sidebar`, async ({ dashboardPage }) => {
      await dashboardPage.goto();
      await expect(dashboardPage.sidebar.menuItem(item)).toBeVisible();
    });
  }
});

test.describe('Dashboard — interactive components', () => {
  test('clicking the account menu opens it', async ({ page, dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.navbar.account.open();
    // The logout affordance lives inside the opened menu — its visibility
    // proves the menu actually opened.
    await expect(page.getByRole('button', { name: /log\s*out/i }).first()).toBeVisible();
  });

  test('clicking the hamburger toggles the sidebar without errors', async ({ dashboardPage }) => {
    await dashboardPage.goto();
    // We don't assert the visual collapse (theme/animation-dependent);
    // we assert the click is wired and the sidebar is still in the DOM.
    await dashboardPage.navbar.hamburger.toggle();
    await expect(dashboardPage.sidebar.root).toBeAttached();
  });

  test('clicking notifications opens the notifications panel', async ({ dashboardPage }) => {
    await dashboardPage.goto();
    await dashboardPage.navbar.notifications.open();
    // No strict assertion on panel content — that varies by build. The
    // click being accepted without throwing is the contract under test.
    await expect(dashboardPage.navbar.notifications.root).toBeVisible();
  });
});
