import { test as base, expect, request as pwRequest, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigManager } from '../config/manager';
import { ApiClient } from './api-client';
import { UserFactory, UserSpec } from './factories';

import { LoginPage } from '../pages/login.page';
import { RegisterPage } from '../pages/register.page';
import { DashboardPage } from '../pages/dashboard.page';

function storageDir(): string {
  return path.resolve(process.cwd(), ConfigManager.get().artifacts.storageStateDir);
}

function workerStatePath(workerIndex: number): string {
  return path.join(storageDir(), `worker-${workerIndex}.json`);
}

function workerUserPath(workerIndex: number): string {
  return path.join(storageDir(), `worker-${workerIndex}.user.json`);
}

function ensureStorageDir(): void {
  const dir = storageDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

type Pages = {
  loginPage: LoginPage;
  registerPage: RegisterPage;
  dashboardPage: DashboardPage;
};

type Fixtures = Pages & {
  /** Unauthenticated API client — useful for register/login flows. */
  anonApi: ApiClient;
  /** Authenticated API client bound to `seededUser`. */
  api: ApiClient;
  /** Per-test fresh user, registered via API. */
  seededUser: UserSpec;
};

type WorkerFixtures = {
  /** Long-lived API client at the worker scope (shared by setup). */
  workerApi: ApiClient;
  /**
   * A worker-scoped user registered once per worker via API. We attach an
   * authenticated browser storageState to the test context so individual
   * tests don't burn time on UI login.
   */
  workerUser: UserSpec;
};

/**
 * The Playwright `test` exported here is the canonical entry point for
 * every spec. It wires in:
 *   - `api` / `anonApi`     →  API-first test setup (bypass UI login)
 *   - `seededUser`          →  fresh user per test, registered via API
 *   - `loginPage`, etc.     →  page objects, scoped to the test's page
 *   - reuse of authenticated storageState for the default `context`
 */
export const test = base.extend<Fixtures, WorkerFixtures>({
  workerApi: [
    async ({}, use) => {
      const cfg = ConfigManager.get();
      const ctx = await pwRequest.newContext({ baseURL: cfg.apiBaseUrl });
      const client = new ApiClient({ baseUrl: cfg.apiBaseUrl, context: ctx });
      await use(client);
      await client.dispose();
    },
    { scope: 'worker' },
  ],

  workerUser: [
    async ({ workerApi }, use, workerInfo) => {
      ensureStorageDir();
      const userPath = workerUserPath(workerInfo.workerIndex);
      let user: UserSpec;
      if (fs.existsSync(userPath)) {
        user = JSON.parse(fs.readFileSync(userPath, 'utf-8')) as UserSpec;
      } else {
        user = UserFactory.build();
        await workerApi.users.register(user);
        fs.writeFileSync(userPath, JSON.stringify(user), 'utf-8');
      }
      await workerApi.loginAs(user.username, user.password);
      await use(user);
    },
    { scope: 'worker' },
  ],

  context: async ({ browser, workerUser }, use, testInfo) => {
    const cfg = ConfigManager.get();
    ensureStorageDir();
    const statePath = workerStatePath(testInfo.workerIndex);

    if (!fs.existsSync(statePath)) {
      // Cold-start: drive UI login once per worker to capture cookies/localStorage.
      const tmpCtx: BrowserContext = await browser.newContext({ baseURL: cfg.baseUrl });
      const page = await tmpCtx.newPage();
      const login = new LoginPage(page);
      await login.goto();
      await login.login(workerUser.username, workerUser.password);
      await page
        .waitForURL((url) => !/\/login$/.test(url.toString()), { timeout: 15_000 })
        .catch(() => {
          /* some builds land directly on `/` */
        });
      await tmpCtx.storageState({ path: statePath });
      await tmpCtx.close();
    }

    const ctx = await browser.newContext({
      baseURL: cfg.baseUrl,
      storageState: statePath,
    });
    await use(ctx);
    await ctx.close();
  },

  anonApi: async ({}, use) => {
    const cfg = ConfigManager.get();
    const client = new ApiClient({ baseUrl: cfg.apiBaseUrl });
    await use(client);
    await client.dispose();
  },

  seededUser: async ({ anonApi }, use) => {
    const user = UserFactory.build();
    await anonApi.users.register(user);
    await use(user);
  },

  api: async ({ seededUser }, use) => {
    const cfg = ConfigManager.get();
    const client = new ApiClient({ baseUrl: cfg.apiBaseUrl });
    await client.loginAs(seededUser.username, seededUser.password);
    await use(client);
    await client.dispose();
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
});

export { expect };
