import { test as base, expect, request as pwRequest } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigManager } from '../config/manager';
import { ApiClient } from './api-client';
import { UserFactory, UserSpec } from './factories';

import { LoginPage } from '../pages/login.page';
import { RegisterPage } from '../pages/register.page';
import { DashboardPage } from '../pages/dashboard.page';

/* ------------------------------------------------------------------ */
/*  Storage path helpers                                              */
/* ------------------------------------------------------------------ */

function storageDir(): string {
  return path.resolve(process.cwd(), ConfigManager.get().artifacts.storageStateDir);
}

function ensureStorageDir(): void {
  const dir = storageDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function workerStatePath(workerIndex: number): string {
  return path.join(storageDir(), `worker-${workerIndex}.json`);
}

function workerUserPath(workerIndex: number): string {
  return path.join(storageDir(), `worker-${workerIndex}.user.json`);
}

/* ------------------------------------------------------------------ */
/*  Worker-user provisioning                                          */
/* ------------------------------------------------------------------ */

/**
 * Resolve (or create) the worker-scoped Vikunja user.
 *
 * Pulled out of the fixture chain on purpose: signup and login specs
 * deliberately want an empty browser context and shouldn't trigger any
 * pre-auth at all. Only the path that actually needs an authenticated
 * browser context (or the `api` fixture) reaches here.
 */
async function provisionWorkerUser(workerIndex: number): Promise<UserSpec> {
  ensureStorageDir();
  const userFile = workerUserPath(workerIndex);
  if (fs.existsSync(userFile)) {
    return JSON.parse(fs.readFileSync(userFile, 'utf-8')) as UserSpec;
  }
  // Stagger concurrent worker boots so we don't all POST /register in the
  // same millisecond — Vikunja + SQLite occasionally 5xx under that race.
  if (workerIndex > 0) {
    await new Promise((r) => setTimeout(r, workerIndex * 400));
  }
  const cfg = ConfigManager.get();
  const client = new ApiClient({ baseUrl: cfg.apiBaseUrl });
  try {
    const user = UserFactory.build();
    await client.users.register(user);
    fs.writeFileSync(userFile, JSON.stringify(user), 'utf-8');
    return user;
  } finally {
    await client.dispose();
  }
}

/* ------------------------------------------------------------------ */
/*  API-only authentication                                           */
/* ------------------------------------------------------------------ */

/**
 * Build an authenticated `storageState` file using ONLY the API — no UI
 * involved. We register the worker user (or load the cached one), call
 * /login to get a JWT, then write that JWT directly into the localStorage
 * entry that Vikunja's SPA reads on boot. The browser context starts
 * already logged in, with zero risk of a LoginPage selector regression
 * breaking dashboard tests.
 *
 * The shape of the file matches Playwright's `storageState` contract so
 * it can be passed straight to `browser.newContext({ storageState })`.
 */
async function buildAuthenticatedStorageState(workerIndex: number): Promise<string> {
  ensureStorageDir();
  const stateFile = workerStatePath(workerIndex);
  if (fs.existsSync(stateFile)) return stateFile;

  const cfg = ConfigManager.get();
  const user = await provisionWorkerUser(workerIndex);

  const client = new ApiClient({ baseUrl: cfg.apiBaseUrl });
  let token: string;
  try {
    const auth = await client.loginAs(user.username, user.password);
    token = auth.token;
  } finally {
    await client.dispose();
  }

  const origin = new URL(cfg.baseUrl).origin;
  const storageState = {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [
          { name: 'token', value: token },
          // Vikunja's SPA reads API_URL from localStorage on cold start.
          { name: 'API_URL', value: cfg.apiBaseUrl },
        ],
      },
    ],
  };

  fs.writeFileSync(stateFile, JSON.stringify(storageState), 'utf-8');
  return stateFile;
}

/* ------------------------------------------------------------------ */
/*  Fixture types                                                     */
/* ------------------------------------------------------------------ */

type Pages = {
  loginPage: LoginPage;
  registerPage: RegisterPage;
  dashboardPage: DashboardPage;
};

type Fixtures = Pages & {
  /** Unauthenticated API client — useful for register/login flows. */
  anonApi: ApiClient;
  /**
   * Authenticated API client. Wrapped on top of the worker-scoped client
   * so the same logged-in session is shared across all tests in a worker.
   */
  api: ApiClient;
  /** Per-test fresh user, registered via API. */
  seededUser: UserSpec;
};

type WorkerFixtures = {
  /** Long-lived API client at the worker scope. */
  workerApi: ApiClient;
  /** Worker-scoped user registered once via API and logged in via workerApi. */
  workerUser: UserSpec;
};

/* ------------------------------------------------------------------ */
/*  Custom test() / expect()                                          */
/* ------------------------------------------------------------------ */

/**
 * The Playwright `test` exported here is the canonical entry point for
 * every spec. It wires:
 *   - `anonApi` / `api`     →  API-first test setup
 *   - `seededUser`          →  fresh user per test, registered via API
 *   - `loginPage`, etc.     →  page objects, scoped to the test's page
 *   - `context` honors test.use({ storageState }) — tests that ask for an
 *     empty state get one with zero worker-side preconditions; everything
 *     else falls through to a worker-authenticated context built via API.
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
      const user = await provisionWorkerUser(workerInfo.workerIndex);
      await workerApi.loginAs(user.username, user.password);
      await use(user);
    },
    { scope: 'worker' },
  ],

  // Custom context:
  //   - if test.use({ storageState }) sets an explicit state (typically
  //     `{ cookies: [], origins: [] }` for the unauthenticated auth
  //     specs), honor it verbatim.
  //   - otherwise build an API-authenticated state by injecting the JWT
  //     into localStorage. NO UI login is involved — so dashboard tests
  //     never depend on the LoginPage selectors being correct.
  context: async ({ browser, storageState }, use, testInfo) => {
    const cfg = ConfigManager.get();

    if (storageState !== undefined) {
      const ctx = await browser.newContext({ baseURL: cfg.baseUrl, storageState });
      await use(ctx);
      await ctx.close();
      return;
    }

    const stateFile = await buildAuthenticatedStorageState(testInfo.workerIndex);
    const ctx = await browser.newContext({
      baseURL: cfg.baseUrl,
      storageState: stateFile,
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

  // `api` reuses the worker's already-authenticated client. Tests that
  // need their own fresh user should depend on `seededUser` + `anonApi`.
  api: async ({ workerApi, workerUser }, use) => {
    void workerUser; // forces login completion before the test starts
    await use(workerApi);
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
