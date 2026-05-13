# Vikunja QA Framework — TypeScript + Playwright

End-to-end test framework for the Vikunja application that ships in
[../application](../application/). Built with **TypeScript** and
**Playwright `^1.49`**, focused on a clean component-based architecture,
SOLID principles, environment-aware configuration, and an API layer that
makes test setup cheap so the UI tests only exercise the flow under test.

---

## 1. Quick start

```bash
# 1. Start the application (from the repo root)
cd application && docker-compose up -d

# 2. Install dependencies & browser binaries
cd ../qa
npm install
npm run install:browsers

# 3. Run the full suite against http://localhost:8080
npm test

# 4. Open the HTML report
npm run report
```

Useful subsets:

| Command | Description |
| --- | --- |
| `npm run test:smoke` | Tests tagged `@smoke` only. |
| `npm run test:api` | API tests (tagged `@api` + `tests/api.spec.ts`). |
| `npm run test:login` | Registration + login flows. |
| `npm run test:projects` | Projects CRUD (UI) + mixed UI/API task flows. |
| `npm run test:headed` | Run with a visible browser. |
| `npm run test:ui` | Playwright UI mode for debugging. |
| `npm run test:debug` | Single-step with the inspector. |
| `npm run codegen` | Launch Playwright codegen against the local app. |
| `npm run lint` | Type-check the project (`tsc --noEmit`). |

### Switching environments

```bash
npm run test:dev         # http://localhost:8080 (default)
npm run test:staging     # config/staging.ts
npm run test:prod        # config/prod.ts
```

Per-run overrides via `.env` (or shell env vars): `BASE_URL`, `API_BASE_URL`,
`HEADLESS`, `WORKERS`, `RETRIES`, `TRACE`, `SLOW_MO`,
`ADMIN_USERNAME`/`ADMIN_PASSWORD`/`ADMIN_EMAIL` (all together or all omitted).

A misconfigured environment fails fast at startup with a descriptive error
from the schema validator, before any test runs.

---

## 2. Project layout

```
qa/
├─ components/                  # Reusable UI panels (NOT pages)
│  ├─ base.component.ts         # Locator-scoped abstract base
│  ├─ confirm-dialog.component.ts
│  ├─ nav-bar.component.ts
│  ├─ project-form.modal.ts
│  ├─ sidebar.component.ts
│  └─ task-list.component.ts
├─ config/
│  ├─ manager.ts                # ConfigManager + zod schema (single source of truth)
│  ├─ dev.ts                    # Local Docker config (default)
│  ├─ staging.ts
│  └─ prod.ts
├─ fixtures/
│  ├─ index.ts                  # Custom test/expect with page+api+user injection
│  ├─ api-client.ts             # BaseApiClient, UsersApi, ProjectsApi, TasksApi, ApiClient facade
│  ├─ api-types.ts              # DTOs / API payload shapes
│  └─ factories.ts              # UserFactory / ProjectFactory / TaskFactory
├─ pages/
│  ├─ page.interface.ts         # IPage contract
│  ├─ base.page.ts
│  ├─ login.page.ts
│  ├─ register.page.ts
│  ├─ dashboard.page.ts         # Composes Sidebar + NavBar + ProjectFormModal
│  └─ project.page.ts           # Composes Sidebar + NavBar + TaskList + ConfirmDialog
├─ tests/
│  ├─ api.spec.ts               # Pure-API tests (auth, projects CRUD, tasks)
│  ├─ example.spec.ts           # Smoke / baseURL sanity
│  ├─ login.spec.ts             # Registration + login (UI)
│  └─ projects.spec.ts          # UI CRUD + combined UI/API task flows
├─ .gitignore
├─ package.json
├─ playwright.config.ts
├─ tsconfig.json
└─ README.md
```

---

## 3. How the design maps to the task expectations

### 3.1 Component-Based Architecture (beyond simple POM)

UI panels live in [components/](components/) and are completely independent
of the pages that host them:

- [components/base.component.ts](components/base.component.ts) — each
  component owns a single Playwright `Locator` root; every internal selector
  is derived from that root.
- [sidebar.component.ts](components/sidebar.component.ts),
  [nav-bar.component.ts](components/nav-bar.component.ts),
  [task-list.component.ts](components/task-list.component.ts),
  [project-form.modal.ts](components/project-form.modal.ts),
  [confirm-dialog.component.ts](components/confirm-dialog.component.ts) —
  reusable across pages.

Pages **compose** components instead of inheriting from them:

```ts
// pages/dashboard.page.ts
this.sidebar     = new Sidebar(page);
this.navbar      = new NavBar(page);
this.projectModal = new ProjectFormModal(page);
```

The same `Sidebar` class is reused on `ProjectPage` — no duplication, and
swapping the sidebar's implementation only touches one file.

### 3.2 SOLID & OOP

| Principle | Where it lives |
| --- | --- |
| **Single Responsibility** | `BaseApiClient` only handles HTTP+auth; resource APIs (`UsersApi`, `ProjectsApi`, `TasksApi`) handle endpoints; components handle DOM panels; pages handle page-level navigation. |
| **Open/Closed** | New resources extend `BaseApiClient`; new pages extend `BasePage`; new components extend `BaseComponent` — none of those base classes change. |
| **Liskov / Interface Segregation** | `IPage` defines the minimal contract (`goto`, `isLoaded`, `waitUntilLoaded`) every page implements — tests can treat any page polymorphically. |
| **Dependency Inversion** | Tests depend on the injected fixtures (`api`, `dashboardPage`, …), not on concrete construction. The Playwright runner is the only place that wires concrete classes together. |

### 3.3 Advanced Configuration Management

Implemented in [config/manager.ts](config/manager.ts) (which absorbs the
zod schema in the same file):

1. **Defaults** are hardcoded in `ConfigManager.DEFAULTS` (safe, conservative).
2. **Environment files** [config/dev.ts](config/dev.ts),
   [config/staging.ts](config/staging.ts),
   [config/prod.ts](config/prod.ts) layer in per-env base URLs.
3. **`process.env` overrides** are the last layer (`.env` or CI variables).
4. The merged object is validated by `AppConfigSchema.safeParse(...)` and
   the test run **fails fast** if any value is missing, malformed, or out of
   range.
5. **Secure defaults**: no committed credentials. Admin credentials are
   optional (`ADMIN_*` env vars); when omitted the framework registers
   throwaway users per worker via API.

### 3.4 Efficiency — combined UI/API

The API layer is the lever for fast, deterministic setup:

- **Authentication**: per-worker, we register a user via API
  (`workerUser`), drive the UI login *once* per worker, and persist
  `storageState` to `.auth/worker-<n>.json`. All subsequent tests in that
  worker open contexts pre-authenticated — no per-test UI login.
- **Data seeding**: tests that aren't *testing* project creation seed
  projects via `api.projects.create(...)` and only use the UI for the
  specific behavior under test. See the rename test in
  [tests/projects.spec.ts](tests/projects.spec.ts).
- **Verification fall-through**: mixed tests use the API as ground truth to
  confirm UI actions actually persisted.

### 3.5 Advanced Playwright usage

Implemented in [fixtures/index.ts](fixtures/index.ts):

- **Custom fixtures** inject page objects (`loginPage`, `registerPage`,
  `dashboardPage`), API clients (`api`, `anonApi`), and seeded users
  (`seededUser`).
- **Worker-scoped fixtures** (`workerApi`, `workerUser`) create exactly one
  user per worker and share it across tests — much cheaper than per-test
  registration, while still **multi-worker-safe** (factories tag every value
  with `Date.now() + workerIndex + random hex`).
- **Storage-state reuse**: the `context` fixture is overridden so every test
  context starts already authenticated via a stored `storageState` JSON.
- **Multiple Playwright projects** in `playwright.config.ts` (`chromium`,
  `api`) — the `api` project is filename-scoped to `api.spec.ts`.
- **Reporters**: `list` (CLI), `html` (interactive report), `junit` (CI).
- **Tags**: `@smoke` and `@api` enable focused runs without touching the
  config (`npm run test:smoke`, `npm run test:api`).

---

## 4. Test scope / checklist

| File | Coverage |
| --- | --- |
| `tests/login.spec.ts` | UI register (happy path), duplicate-username negative, UI login (happy path), wrong-password negative. |
| `tests/api.spec.ts` | JWT shape on valid creds, 4xx on wrong creds, full Projects CRUD via API, empty-title negative, Tasks API lifecycle (create/list/done/delete). |
| `tests/projects.spec.ts` | UI create from sidebar; **mixed** API seed → UI rename → API verify; UI delete; UI add-task → API verify; API task → UI render; UI toggle-done → API verify. |
| `tests/example.spec.ts` | Smoke check that the configured `baseURL` resolves and serves Vikunja. |

**Why this slice**: projects is the most exercised functional surface in
Vikunja and gives the richest CRUD coverage; tasks let us demonstrate the
mixed UI/API value cleanly. Teams were left out intentionally to keep the
surface area focused — adding `TeamsApi` would be a straight repeat of the
same pattern (extend `BaseApiClient`, add a factory, add a spec).

---

## 5. Design choices worth flagging

1. **One user per worker, not per test.** Per-test registration would
   roughly double total run time at 4 workers; per-worker caching gives
   isolation between *workers* (which is what matters for parallelism)
   without the per-test cost.
2. **API client is a facade, not a god class.** `ApiClient` composes
   `UsersApi`/`ProjectsApi`/`TasksApi` instead of merging them — each
   resource is independently testable, mockable, and extensible.
3. **Components own their root locator.** This is the single rule that
   keeps components reusable: a component never reaches outside `this.root`,
   so it doesn't care whether it lives on a Dashboard or a Project page.
4. **Resilient selectors.** Selectors prefer ARIA roles and visible text
   (`getByRole`, `getByLabel`), falling back to `data-cy`/CSS chains.
   Vikunja does not ship many `data-cy` hooks today, so the framework will
   keep working if the dev team adds them later.
5. **No committed secrets.** `.env` is gitignored. CI environments inject
   real values via secret stores.
6. **`expect.poll` for cross-layer assertions.** Mixed UI→API checks use
   `expect.poll` so we don't race the backend on persistence.

---

## 6. Troubleshooting

- **`Invalid configuration for TEST_ENV="…"`** — a required value is
  missing or malformed. The error lists exactly which field; check the
  matching file under `config/` or your `.env`.
- **Tests fail with `ECONNREFUSED`** — the Vikunja container isn't up.
  Run `docker-compose ps` in `../application/` and check `vikunja` is
  `Up`. View logs with `docker-compose logs -f vikunja`.
- **UI selectors fail after a Vikunja upgrade** — components prefer ARIA
  roles, but if the upstream app rewrites the DOM the components in
  [components/](components/) are the only place you need to touch.
- **`PWDEBUG=1 npm test`** opens the inspector for any failing test.
- **`npm run report`** opens the last HTML report (with traces, screenshots,
  and videos for failures).
