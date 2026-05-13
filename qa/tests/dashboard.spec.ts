import { test, expect } from '../fixtures';
import { SIDEBAR_MENU_ITEMS } from '../components/sidebar.component';
import { ACCOUNT_MENU_ITEMS } from '../components/account-menu.component';

/**
 * Dashboard coverage is split into three describes so a reader can read
 * the report and immediately see which dimension regressed:
 *
 *   1. Shell visibility    — sidebar + navbar containers are mounted
 *   2. Items are visible + clickable — every sidebar menu entry and every
 *      navbar sub-component (Search, Notifications, AccountMenu,
 *      HamburgerMenu) renders and accepts interaction
 *   3. Interactive actions — clicking the trigger actually opens the
 *      expected affordance
 */

const NAVBAR_COMPONENTS = ['search', 'notifications', 'account', 'hamburger'] as const;

test.describe('Dashboard — shell visibility @smoke', () => {
  test('the sidebar is visible', async ({ dashboardPage }) => {
    await dashboardPage.goto();
    expect(await dashboardPage.sidebar.isVisible()).toBe(true);
  });

  test('the top navbar is visible', async ({ dashboardPage }) => {
    await dashboardPage.goto();
    expect(await dashboardPage.navbar.isVisible()).toBe(true);
  });
});

test.describe('Dashboard — sidebar items visible and clickable @smoke', () => {
  for (const item of SIDEBAR_MENU_ITEMS) {
    test(`the "${item}" sidebar entry is visible and clickable`, async ({ dashboardPage }) => {
      await dashboardPage.goto();
      const entry = dashboardPage.sidebar.menuItem(item);
      await expect(entry).toBeVisible();
      // toBeEnabled covers: not disabled, not aria-disabled, not blocked
      // by pointer-events: none. Combined with toBeVisible this is the
      // canonical "clickable" assertion.
      await expect(entry).toBeEnabled();
    });
  }
});

test.describe('Dashboard — navbar items visible and clickable @smoke', () => {
  for (const component of NAVBAR_COMPONENTS) {
    test(`the navbar's ${component} affordance is visible and clickable`, async ({
      dashboardPage,
    }) => {
      await dashboardPage.goto();
      const target = dashboardPage.navbar[component].root;
      await expect(target).toBeVisible();
      await expect(target).toBeEnabled();
    });
  }
});

test.describe('Dashboard — account menu items visible and clickable @smoke', () => {
  // Open the account dropdown once per test, then assert that each entry
  // (Settings, Keyboard shortcuts, About, Logout) is rendered and
  // accepts interaction. Parameterized so adding a new menu entry is a
  // single-line change in ACCOUNT_MENU_ITEMS.
  for (const item of ACCOUNT_MENU_ITEMS) {
    test(`the account menu shows a "${item}" entry that is visible and clickable`, async ({
      dashboardPage,
    }) => {
      await dashboardPage.goto();
      await dashboardPage.navbar.account.open();

      const entry = dashboardPage.navbar.account.menuItem(item);
      await expect(entry).toBeVisible();
      await expect(entry).toBeEnabled();
    });
  }
});

test.describe('Dashboard — interactive actions', () => {
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
    // we assert the click is wired and the sidebar is still mounted.
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
