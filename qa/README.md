# Vikunja QA Framework — TypeScript + Playwright

End-to-end test framework for the Vikunja application that ships in
[../application](../application/). Built with **TypeScript** and
**Playwright `^1.49`**, focused on a clean component-based architecture,
SOLID principles, environment-aware configuration, and an API layer that
makes test setup cheap so the UI tests only exercise the flow under
test.

The framework covers:

- **Authentication** — signup, login, logout, "stay logged in" feature
- **Dashboard shell** — sidebar items, top navbar (search / notifications /
  account menu / hamburger), interactive actions
- **Sidebar menu pages** — Overview, Upcoming, Projects, Labels, Teams, Inbox
- **Projects** — list view, creating one or many, input validation
- **Project details** — task creation (single, multiple, API↔UI mirror), mark
  as done via task details page, render in **List**, **Table**, and
  **Kanban** views (including done-state cues)

---

## 1. Quick start

```bash
# 1. Start the application (from the repo root)
cd application && docker-compose up -d   # or run start-vikunja.ps1 for a binary-only setup

# 2. Install dependencies & browser binaries
cd ../qa
npm install
npm run install:browsers

# 3. Run the full suite against http://localhost:8080
npm test

# 4. Open the HTML report
npm run report
```

### Per-spec scripts

Each spec has its own script for focused debugging:

| Spec / area | Script |
| --- | --- |
| Signup (UI register + validation) | `npm run test:signup` |
| Login (UI login + validation + stay-logged-in finding) | `npm run test:login` |
| Logout | `npm run test:logout` |
| Dashboard (shell + sidebar/navbar items + interactions) | `npm run test:dashboard` |
| Overview / Upcoming / Labels / Teams / Inbox (menu pages) | `npm run test:overview`, `:upcoming`, `:labels`, `:teams`, `:inbox` |
| Projects (CRUD UI + validation) | `npm run test:projects` |
| Project details (tasks + views) | `npm run test:project-details` |

### Run modes

```bash
npm test                      # full suite, headless, parallel
npm run test:smoke            # only tests tagged @smoke
npm run test:headed           # headed (visible browser)
npm test -- --headed --workers=1   # headed, sequential, easy to watch
npm run test:ui               # Playwright UI mode (timeline + locator picker)
npm run test:debug            # PWDEBUG inspector
npm run codegen               # record interactions against the local app
npm run lint                  # type-check (tsc --noEmit)
```

### Slow-motion for watching

```powershell
$env:SLOW_MO="500"; npm run test:project-details -- --headed --workers=1
```

`SLOW_MO` is read by `ConfigManager` and pauses 500ms between every action.

### Switching environments

```bash
npm run test:dev         # config/dev.ts → http://localhost:8080 (default)
npm run test:staging     # config/staging.ts
npm run test:prod        # config/prod.ts
```

A misconfigured environment fails fast at startup with a descriptive
error from the zod schema validator — before any test runs.

---

## 2. Project layout

```
qa/
├─ components/                          # Reusable UI panels (NOT pages)
│  ├─ base.component.ts                 # Abstract: every component owns one Locator root
│  ├─ sidebar.component.ts              # SIDEBAR_MENU_ITEMS + menuItem/navigateTo
│  ├─ nav-bar.component.ts              # Composes the four sub-components below
│  ├─ search.component.ts               # Top-bar search trigger + input
│  ├─ notifications.component.ts        # Bell icon
│  ├─ account-menu.component.ts         # ACCOUNT_MENU_ITEMS (Settings / Keyboard shortcuts / About / Logout)
│  ├─ hamburger-menu.component.ts       # Sidebar collapse toggle
│  ├─ new-project-modal.component.ts    # "New project" dialog
│  ├─ project-view-tabs.component.ts    # PROJECT_VIEWS (List / Gantt / Table / Kanban)
│  └─ task-list.component.ts            # Add-task input, items, openTask, markDone
├─ config/
│  ├─ manager.ts                        # ConfigManager + zod schema (single source of truth)
│  ├─ dev.ts                            # http://localhost:8080 (default)
│  ├─ staging.ts
│  └─ prod.ts
├─ fixtures/
│  ├─ index.ts                          # Custom test() with page/api/user injection + API-only auth
│  ├─ api-client.ts                     # BaseApiClient + UsersApi/ProjectsApi/TasksApi + ApiClient facade
│  ├─ api-types.ts                      # User, Project, Task DTOs
│  └─ factories.ts                      # UserFactory, ProjectFactory, TaskFactory
├─ pages/
│  ├─ page.interface.ts                 # IPage contract
│  ├─ base.page.ts                      # Abstract: path + goto + waitUntilLoaded
│  ├─ authenticated.page.ts             # Abstract: composes Sidebar + NavBar (shared by every authenticated page)
│  ├─ login.page.ts
│  ├─ register.page.ts
│  ├─ dashboard.page.ts                 # `/` — patient 20s wait for the home view's slower cold start
│  ├─ overview.page.ts                  # Sidebar → "Overview"
│  ├─ upcoming.page.ts                  # `/tasks/by/upcoming`
│  ├─ projects.page.ts                  # `/projects` — composes NewProjectModal
│  ├─ project-details.page.ts           # `/projects/<id>` — composes TaskList + ProjectViewTabs
│  ├─ task-details.page.ts              # `/tasks/<id>` — exposes Mark-as-done
│  ├─ labels.page.ts                    # `/labels`
│  ├─ teams.page.ts                     # `/teams`
│  └─ inbox.page.ts                     # `/projects/-1`
├─ tests/
│  ├─ signup.spec.ts                    # UI register + validation (8 tests)
│  ├─ login.spec.ts                     # UI login + validation + JWT finding (12 tests)
│  ├─ logout.spec.ts                    # 2 tests
│  ├─ dashboard.spec.ts                 # Shell, sidebar items, navbar items, account menu, interactions (19 tests)
│  ├─ overview.spec.ts                  # 2 tests
│  ├─ upcoming.spec.ts                  # 2 tests
│  ├─ projects.spec.ts                  # Trigger, modal, create (single/many), validation (10 tests)
│  ├─ project-details.spec.ts           # Shell, task creation, views, done state, validation (13 tests)
│  ├─ labels.spec.ts                    # 2 tests
│  ├─ teams.spec.ts                     # 2 tests
│  └─ inbox.spec.ts                     # 2 tests
├─ .gitignore
├─ package.json
├─ playwright.config.ts
├─ tsconfig.json
└─ README.md
```

---

## 3. How the design maps to the task expectations

### 3.1 Component-Based Architecture (beyond simple POM)

UI panels live in [components/](components/) and are decoupled from the
pages that host them. Pages **compose** components instead of inheriting
from them.

**Reusable across screens:**
- `Sidebar` and `NavBar` — present on every authenticated page
- `Search`, `Notifications`, `AccountMenu`, `HamburgerMenu` — sub-components of `NavBar`, each independently testable

**Reusable across flows:**
- `NewProjectModal` — the project creation dialog
- `TaskList` — task list + add-task input + done-toggle
- `ProjectViewTabs` — List / Gantt / Table / Kanban switcher

Example composition:

```ts
// pages/project-details.page.ts
this.sidebar = new Sidebar(page);     // inherited from AuthenticatedPage
this.navbar  = new NavBar(page);      // inherited from AuthenticatedPage (composes Search/Notif/Account/Hamburger)
this.tasks   = new TaskList(page);
this.views   = new ProjectViewTabs(page);
```

Each component owns a single `root: Locator`. Internal selectors are
derived from that root, so a component never reaches outside its scope
— which is why the same `Sidebar` works on Dashboard, ProjectDetails,
Overview, etc., without any duplication.

### 3.2 SOLID & OOP

| Principle | Where it lives |
| --- | --- |
| **Single Responsibility** | `BaseApiClient` only handles HTTP + auth; resource APIs handle endpoints; components handle DOM panels; pages handle navigation; fixtures handle wiring. |
| **Open/Closed** | New resources extend `BaseApiClient` (Users → Projects → Tasks); new pages extend `BasePage` or `AuthenticatedPage`; new components extend `BaseComponent`. None of those base classes change. |
| **Liskov / Interface Segregation** | `IPage` defines the minimal contract (`goto`, `isLoaded`, `waitUntilLoaded`) every page implements. Tests treat pages polymorphically. |
| **Dependency Inversion** | Tests depend on injected fixtures (`api`, `dashboardPage`, …), not concrete construction. Playwright's runner is the only place that wires concrete classes together. |

**Abstract base classes carry shared behavior:**
- `BaseComponent` — Locator scoping + readiness checks
- `BasePage` / `AuthenticatedPage` — `goto` flow + shell composition
- `BaseApiClient` — token-aware HTTP wrapper + uniform error handling

### 3.3 Advanced Configuration Management

Implemented in [config/manager.ts](config/manager.ts) (zod schema in the
same file for one-source-of-truth):

1. **Defaults** are hardcoded in `ConfigManager.DEFAULTS`.
2. **Per-env files** ([dev.ts](config/dev.ts), [staging.ts](config/staging.ts),
   [prod.ts](config/prod.ts)) layer in environment-specific base URLs.
3. **`process.env` overrides** are the last layer (`.env` or CI variables).
4. The merged object is validated by `AppConfigSchema.safeParse(...)` —
   the test run **fails fast** if any value is missing, malformed, or
   out of range, with a descriptive list of issues.
5. **Secure defaults** — no committed credentials. Admin credentials are
   optional (`ADMIN_*` env vars); when omitted, the framework registers
   throwaway users per worker via API.

### 3.4 Efficiency — combined UI/API

The API layer is the lever for fast, deterministic setup.

**API-only authentication.** The `context` fixture in
[fixtures/index.ts](fixtures/index.ts) authenticates by:
1. Registering a worker user via API.
2. Calling `POST /api/v1/login` to get a JWT.
3. Injecting the JWT directly into the SPA's `localStorage` via
   `storageState`.

There is **no UI cold-start login** — dashboard / projects / task tests
never depend on the LoginPage selectors being correct. Login UI tests
exist in their own spec and cover that surface separately.

**Self-healing auth cache.** The framework caches the storage state per
worker between runs in `.auth/worker-N.json`. On startup it:
1. Reads the cached JWT.
2. Checks its `exp` claim locally.
3. Pings `/api/v1/user` to confirm Vikunja still honors it.

If either check fails (Vikunja restarted, DB wiped, secret rotated), the
cache is wiped and re-provisioned automatically. Validation happens at
most once per worker per run.

**Combined UI/API tests.** Many tests use the API for setup and the UI
for the path under test. Examples:
- Signup: API-seed a user, then UI-register the same username → assert duplicate-error
- Projects: UI create → API verify persistence
- Project details: API seed project + task → UI assert it renders in the Table / Kanban views
- Tasks: API mark done → UI assert the done cue appears in Table + Kanban
- Open task: UI navigate to `/tasks/<id>` from the project page → UI mark as done → API verify

### 3.5 Advanced Playwright usage

Implemented in [fixtures/index.ts](fixtures/index.ts):

- **Custom fixtures** inject page objects (`loginPage`, `registerPage`,
  `dashboardPage`), API clients (`api`, `anonApi`), and seeded users
  (`seededUser`).
- **Worker-scoped fixtures** (`workerApi`, `workerUser`) create exactly
  one user per worker.
- **Multi-worker safe** — factories tag every value with
  `Date.now() + workerIndex + random hex`, and worker registration
  staggers by `workerIndex × 400ms` so SQLite contention doesn't 5xx the
  startup.
- **Storage-state reuse + validation** — every test context starts
  authenticated via the worker's `storageState`, but the cache is
  validated against the live server before being trusted (see 3.4).
- **`test.use({ storageState })` honored** — signup and login specs
  opt-in to an empty browser context with zero pre-auth.
- **Single chromium project** in `playwright.config.ts` — filtering by
  tag (`--grep @api`, `--grep @smoke`) is the canonical way to run
  subsets.
- **Reporters**: `list` (CLI), `html` (interactive report with
  screenshots / videos / traces on failure), `junit` (CI).
- **Tags**: `@smoke` for the core happy-paths; `@api` is reserved for
  future pure-API specs.

---

## 4. Test scope / checklist

| File | Coverage | Count |
| --- | --- | ---: |
| `tests/signup.spec.ts` | UI register happy path • duplicate-username error • clicking "Login" on signup navigates to `/login` • register button disabled when empty • per-field validation (username/email/password) • invalid email rejected | 8 |
| `tests/login.spec.ts` | UI login by **username** • UI login by **email** • wrong password • unknown username • unknown email • submit button enabled at all times (Vikunja v2 observation) • empty-field per-field error • stay-logged-in checkbox visible and toggleable • **stay-logged-in JWT lifetime finding** (`test.fail` annotated with observation) • forgot-password recovery flow • clicking "Create account" navigates to `/register` | 12 |
| `tests/logout.spec.ts` | Logout returns to `/login` • after logout, protected dashboard re-redirects to `/login` (proves the session was actually cleared) | 2 |
| `tests/dashboard.spec.ts` | Sidebar + navbar mounted • per-sidebar-menu-item visibility & clickability (Overview / Upcoming / Projects / Labels / Teams / Inbox) • per-navbar-component visibility & clickability (search / notifications / account / hamburger) • per-account-menu-entry visibility & clickability (Settings / Keyboard shortcuts / About / Logout) • account menu opens • hamburger toggles • notifications open | 19 |
| `tests/overview.spec.ts` `tests/upcoming.spec.ts` `tests/labels.spec.ts` `tests/teams.spec.ts` `tests/inbox.spec.ts` | Sidebar navigation lands on the right route + shared shell renders | 2 each |
| `tests/projects.spec.ts` | Sidebar navigation • shell renders • new-project trigger visible + clickable • clicking opens the modal • UI create lands on details page + persists in API • create three in sequence (with sidebar nav between each) • modal submit disabled when title empty • submit toggles as title is typed/cleared • cancel doesn't persist anything • API rejects empty-title payload • project details renders after API-seeded project | 10 |
| `tests/project-details.spec.ts` | Shell + project title visible • add-task input visible • UI add task (UI + API verified) • multiple tasks in sequence • API-seeded task renders in UI • open task and mark done via task details page • API-seeded task visible in **Table** view • API-seeded task visible in **Kanban** view • **done state** reflected in Table view (visible + cue) • **done state** reflected in Kanban view • empty-title UI no-op • API rejects empty title | 13 |

**Total: ~80 tests across 11 spec files.**

---

## 5. Design choices worth flagging

1. **API-only authentication for non-auth tests.** Dashboard, project,
   menu, and task tests never go through the login UI. If the login
   form ever regresses, only login tests break — failure domains are
   cleanly isolated.
2. **Self-healing storage-state cache.** Cached JWTs are validated
   against the live server before being trusted. No more "wipe `.auth/`
   to make tests pass" rituals.
3. **One user per worker, not per test.** Per-test registration would
   roughly double total run time at 4 workers; per-worker caching gives
   isolation between *workers* (which is what matters for parallelism)
   without the per-test cost.
4. **API client is a facade, not a god class.** `ApiClient` exposes
   `.users`, `.projects`, `.tasks`. Adding `.teams` later is one
   composition line.
5. **Components own their root locator.** A component never reaches
   outside `this.root`, so it doesn't care whether it lives on the
   Dashboard, a Project page, or a future surface.
6. **Resilient selectors.** Selectors prefer ARIA roles and visible
   text (`getByRole`, `getByLabel`), falling back to class chains.
   Vikunja v2's specific DOM (`.fancy-checkbox`, `<input name="projectTitle">`,
   `.message.danger`) is targeted where ARIA isn't available.
7. **`test.fail()` for documented findings.** The "stay logged in"
   JWT-lifetime test deliberately fails on Vikunja v2.3.0 and is
   annotated with the reason. If Vikunja ever changes the behavior,
   the test flips to "unexpected pass" and forces cleanup.
8. **`expect.poll` for cross-layer assertions.** Mixed UI→API checks
   use `expect.poll` so we don't race the backend on persistence.
9. **No committed secrets.** `.env` is gitignored; admin credentials,
   if used, come from CI's secret store.

---

## 6. Findings worth surfacing to the dev team

These came up while writing the framework — kept as living
documentation in the suite itself.

1. **`Stay logged in` doesn't change JWT lifetime on Vikunja v2.3.0.**
   The `tests/login.spec.ts` test compares the `exp` claim of JWTs
   issued with the box checked vs unchecked; the delta is consistent
   with clock progression (< 5s). The test is annotated with
   `test.fail()` so it runs every suite and documents the finding —
   if upstream changes the behavior, the test will start failing
   loudly.
2. **The login form's submit button is enabled at all times.** Unlike
   the signup form (which gates submit on field validity), Vikunja v2
   keeps `Login` clickable; validation runs only on submit. Tests
   target the post-submit field errors instead of the button state.
3. **The new-project modal has no description field on v2.** The
   modal renders only Title, Parent Project, and Color. `NewProjectModal.fillForm`
   silently no-ops when a description is passed.
4. **Vikunja's task checkbox is a custom SVG.** `<input type="checkbox">`
   is in the DOM but visually hidden under the SVG; the click handler
   is on the wrapping `<label>`. The "mark as done" test uses the
   task details page's `Mark as done` button rather than the inline
   checkbox because the latter's event wiring is build-specific.

---

## 7. Troubleshooting

- **`Invalid configuration for TEST_ENV="…"`** — a required value is
  missing or malformed. The error lists exactly which field; check the
  matching file under `config/` or your `.env`.
- **Tests fail with `ECONNREFUSED`** — Vikunja isn't running. Check
  `docker-compose ps` in `../application/` or restart via
  `start-vikunja.ps1`.
- **Cached JWT became stale** — the framework self-heals (see §3.4).
  You no longer need to wipe `.auth/` manually between runs.
- **UI selectors fail after a Vikunja upgrade** — components prefer
  ARIA roles, but if upstream rewrites the DOM the locators in
  [components/](components/) are usually the only place you need to
  touch.
- **Watch the suite run** — `npm test -- --headed --workers=1`.
- **Slow motion** — `$env:SLOW_MO="500"` before the command.
- **`PWDEBUG=1 npm test`** opens the inspector for any failing test.
- **`npm run report`** opens the last HTML report (with traces,
  screenshots, and videos for failures).
