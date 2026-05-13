# Vikunja QA Framework — TypeScript + Playwright

End-to-end test framework for the Vikunja application that ships in
[../application](../application/). Implements every item the upstream
task asked for, plus several extensions (component-based architecture,
API-only authentication, self-healing storage state, parameterized
suites).

---

## 1. Tech stack

| Tool | Version |
| --- | --- |
| TypeScript | 5.7+ |
| **Playwright** | **^1.49.1** |
| Node.js | 18+ (tested on 22) |
| zod (config schema validation) | 3.24+ |

Browser binaries are installed via `npm run install:browsers`.

---

## 2. How to run the tests

### Prerequisites

1. Start the application:
   ```bash
   cd ../application && docker-compose up -d
   ```
2. Confirm it's reachable at http://localhost:8080.
3. Install dependencies and browsers:
   ```bash
   cd ../qa
   npm install
   npm run install:browsers
   ```

### Run commands

| Goal | Command |
| --- | --- |
| **Full suite** (headless, parallel) | `npm test` |
| **Watch in browser** (sequential) | `npm test -- --headed --workers=1` |
| **HTML report** after a run | `npm run report` |
| **Smoke-only** (`@smoke` tag) | `npm run test:smoke` |
| **Playwright UI mode** (timeline + locator picker) | `npm run test:ui` |
| **Codegen** (record interactions) | `npm run codegen` |
| **Inspector debug** | `npm run test:debug` |
| **Type-check** the project | `npm run lint` |

### Per-spec scripts

```bash
npm run test:signup           # signup spec
npm run test:login            # login spec
npm run test:logout           # logout spec
npm run test:dashboard        # dashboard shell + items
npm run test:overview         # sidebar → Overview
npm run test:upcoming         # sidebar → Upcoming
npm run test:projects         # sidebar → Projects (CRUD UI)
npm run test:project-details  # project details (tasks, views, edit/delete)
npm run test:labels           # sidebar → Labels
npm run test:teams            # sidebar → Teams
npm run test:inbox            # sidebar → Inbox
```

### Switching environments

```bash
npm run test:dev         # config/dev.ts → http://localhost:8080 (default)
npm run test:staging     # config/staging.ts
npm run test:prod        # config/prod.ts
```

A misconfigured environment fails fast with a descriptive error from
the zod schema — before any test runs.

### Watching at a slower pace

```powershell
$env:SLOW_MO="500"; npm run test:project-details -- --headed --workers=1
```

`SLOW_MO` is read by `ConfigManager` and pauses 500ms between actions.

---

## 3. Project structure

```
qa/
├─ components/                          # Reusable UI panels — composed into pages
│  ├─ base.component.ts                 # Abstract: every component owns one Locator root
│  ├─ sidebar.component.ts              # Typed SIDEBAR_MENU_ITEMS + menuItem/navigateTo
│  ├─ nav-bar.component.ts              # Composes the four sub-components below
│  ├─ search.component.ts               # Top-bar search trigger
│  ├─ notifications.component.ts        # Bell icon
│  ├─ account-menu.component.ts         # ACCOUNT_MENU_ITEMS (Settings/Keyboard shortcuts/About/Logout)
│  ├─ hamburger-menu.component.ts       # Sidebar collapse toggle
│  ├─ new-project-modal.component.ts    # "New project" dialog
│  ├─ project-view-tabs.component.ts    # PROJECT_VIEWS (List/Gantt/Table/Kanban)
│  ├─ project-actions-menu.component.ts # 3-dots menu (Edit/Archive/Duplicate/Delete)
│  ├─ confirm-dialog.component.ts       # Generic "are you sure?" dialog
│  └─ task-list.component.ts            # Add-task input, items, openTask, markDone
├─ config/
│  ├─ manager.ts                        # ConfigManager + zod schema (single source of truth)
│  ├─ dev.ts                            # http://localhost:8080 (default)
│  ├─ staging.ts
│  └─ prod.ts
├─ fixtures/
│  ├─ index.ts                          # Custom test() — API-only auth + self-healing cache
│  ├─ api-client.ts                     # BaseApiClient + Users/Projects/Tasks + ApiClient facade
│  ├─ api-types.ts                      # User, Project, Task DTOs
│  └─ factories.ts                      # UserFactory, ProjectFactory, TaskFactory
├─ pages/
│  ├─ page.interface.ts                 # IPage contract
│  ├─ base.page.ts                      # Abstract: path + goto + waitUntilLoaded
│  ├─ authenticated.page.ts             # Abstract: composes Sidebar + NavBar
│  ├─ login.page.ts / register.page.ts
│  ├─ dashboard.page.ts                 # `/`
│  ├─ overview.page.ts / upcoming.page.ts / labels.page.ts / teams.page.ts / inbox.page.ts
│  ├─ projects.page.ts                  # `/projects` — composes NewProjectModal
│  ├─ project-details.page.ts           # `/projects/<id>` — composes TaskList + ProjectViewTabs + ProjectActionsMenu + ConfirmDialog
│  └─ task-details.page.ts              # `/tasks/<id>` — exposes "Mark as done"
├─ tests/
│  ├─ signup.spec.ts (8) • login.spec.ts (12) • logout.spec.ts (2)
│  ├─ dashboard.spec.ts (19)
│  ├─ overview/upcoming/labels/teams/inbox.spec.ts (2 each)
│  ├─ projects.spec.ts (10) — CRUD UI + validation
│  └─ project-details.spec.ts (15) — tasks, views, done state, edit, delete
├─ playwright.config.ts
├─ tsconfig.json
├─ package.json
└─ README.md
```

---

## 4. Features and design choices

### 4.1 Component-Based Architecture (beyond simple POM)

UI panels live in [components/](components/) and are decoupled from the
pages that host them. Pages **compose** components instead of inheriting
from them. The same `Sidebar` and `NavBar` work across every
authenticated page; the same `TaskList` works on the project details
page and any future surface that renders a task list.

### 4.2 SOLID & OOP

- **Single Responsibility** — base classes (`BaseApiClient`, `BasePage`,
  `BaseComponent`) own one concern each.
- **Open/Closed** — new resources extend `BaseApiClient`; new pages
  extend `BasePage`/`AuthenticatedPage`; new components extend
  `BaseComponent`. The bases don't change.
- **Interface segregation** — `IPage` defines the minimal page contract.
- **Dependency Inversion** — tests depend on injected fixtures
  (`api`, `dashboardPage`, …), not concrete construction.

### 4.3 Advanced configuration

[config/manager.ts](config/manager.ts) layers values:
**defaults < per-env file < `process.env` overrides**, then validates
the merged object with zod. Misconfiguration fails fast with a
descriptive error before any test runs. No committed secrets.

### 4.4 Combined UI/API tests (efficiency)

The API layer is the lever for fast, deterministic setup. Examples
of tests that pair both surfaces:

- **Auth** — API-seed an existing user, then UI-attempt the same
  username → assert duplicate-error.
- **Projects** — UI create → API verify persistence; multiple
  projects in sequence with sidebar nav between each.
- **Project details** — API seed → UI assert renders in Table /
  Kanban views; API seed → UI mark task done from the task details
  page → API verify `done: true`.
- **Edit / delete** — UI edit project title → API verify rename →
  UI verify both the details heading and the `/projects` list reflect
  the new title.

### 4.5 Advanced Playwright usage

- **Custom fixtures** inject page objects, API clients, and seeded
  users.
- **Worker-scoped fixtures** + **multi-worker-safe** factories tag
  every value with `Date.now() + workerIndex + random hex`.
- **API-only authentication** — the `context` fixture builds an
  authenticated storage state by calling `/api/v1/login` and injecting
  the JWT directly into `localStorage`. No UI cold-start login.
- **Self-healing auth cache** — cached JWTs are validated against the
  live server (`/api/v1/user`) before being trusted. If invalid (DB
  wipe, JWT secret rotation, …), the cache is wiped and re-provisioned
  automatically.
- **Reporters** — `list`, `html`, `junit`.
- **Tags** — `@smoke` enables focused runs without config edits.

---

## 5. CRUD coverage

The brief requires **CRUD on one of: projects / tasks / teams**.
This submission implements **full CRUD on Projects** + extends to
**partial CRUD on Tasks**.

| Resource | Create | Read | Update | Delete |
| --- | --- | --- | --- | --- |
| **Projects** | ✅ UI (`projects.spec.ts:42`) + API | ✅ Sidebar list + `/projects` page | ✅ Edit title via 3-dots menu (`project-details.spec.ts`) | ✅ Delete via 3-dots menu + confirm dialog |
| **Tasks** | ✅ UI + API | ✅ Rendered in List, Table, and Kanban views | ✅ Mark-as-done via task details page | (not exercised) |
| **Users** | ✅ Registration via UI + API | ✅ via JWT/`/user` | n/a | n/a |

---

## 6. Test scope / checklist

| Spec | Coverage | Count |
| --- | --- | ---: |
| `tests/signup.spec.ts` | UI register happy path • duplicate-username error • clicking "Login" navigates to `/login` • register button disabled when empty • per-field validation (username/email/password) • invalid email rejected | 8 |
| `tests/login.spec.ts` | UI login by **username** • UI login by **email** • wrong password • unknown username • unknown email • submit button always enabled (v2 observation) • empty-field per-field errors • stay-logged-in checkbox toggleable • **stay-logged-in JWT lifetime finding** (`test.fail` documented) • forgot-password flow • clicking "Create account" navigates to `/register` | 12 |
| `tests/logout.spec.ts` | Logout returns to `/login` • after logout, protected dashboard re-redirects to `/login` | 2 |
| `tests/dashboard.spec.ts` | Sidebar + navbar mounted • sidebar item visibility & clickability (Overview/Upcoming/Projects/Labels/Teams/Inbox) • navbar sub-component visibility & clickability (search/notifications/account/hamburger) • account-menu entry visibility & clickability (Settings/Keyboard shortcuts/About/Logout) • account menu opens • hamburger toggles • notifications open | 19 |
| `tests/overview.spec.ts` `tests/upcoming.spec.ts` `tests/labels.spec.ts` `tests/teams.spec.ts` `tests/inbox.spec.ts` | Sidebar navigation lands on the right route + shared shell renders | 2 each |
| `tests/projects.spec.ts` | Sidebar navigation • shell renders • new-project trigger visible + clickable • clicking opens the modal • UI create lands on details page + persists in API • create three in sequence • submit disabled on empty title • submit toggles as title typed/cleared • cancel doesn't persist • API rejects empty title • details renders after API-seeded project | 10 |
| `tests/project-details.spec.ts` | Shell + project title visible • add-task input visible • UI add task (UI + API verified) • multiple tasks in sequence • API-seeded task renders • **open task and mark done via task details page** • API-seeded task visible in **Table** view • API-seeded task visible in **Kanban** view • **done state cue** in Table • **done state cue** in Kanban • **edit project** (details heading + `/projects` list + API) • **delete project** (`/projects` list + API) • empty-title UI no-op • API rejects empty-title task | 15 |

**Total: 80+ tests across 11 spec files.**

---

## 7. Findings worth surfacing to the dev team

These came up while writing the framework and are kept as living
documentation in the suite itself.

1. **`Stay logged in` doesn't change JWT lifetime on Vikunja v2.3.0.**
   `tests/login.spec.ts` compares the `exp` claim of JWTs issued with
   the box checked vs unchecked; the delta is consistent with clock
   progression (< 5s). Annotated with `test.fail()` so it runs every
   suite and documents the observation — if upstream changes the
   behavior, the test flips to "unexpected pass".
2. **The login form's submit button is enabled at all times.** Unlike
   the signup form (which gates submit on field validity), Vikunja v2
   keeps "Login" clickable; validation runs only on submit.
3. **The new-project modal has no description field on v2.** Renders
   only Title, Parent Project, and Color.
4. **Edit project modal uses a different title input than New project.**
   Edit uses `<input id="title">`; New uses `<input name="projectTitle">`.
   Both share `<label for="…">Title</label>`, so `getByLabel('Title')`
   is the one selector that works for either surface.
5. **Vikunja's task checkbox is a custom SVG.** `<input type="checkbox">`
   is hidden under the SVG; the framework drives mark-done via the
   task details page's button instead.

---

## 8. Troubleshooting

- **`Invalid configuration for TEST_ENV="…"`** — a required value is
  missing or malformed. Error lists the field; check
  [config/](config/) or your `.env`.
- **Tests fail with `ECONNREFUSED`** — Vikunja isn't running. Check
  `docker-compose ps` in `../application/`.
- **Cached JWT stale** — the framework self-heals (validates against
  `/api/v1/user` before trusting). You no longer need to wipe `.auth/`
  manually.
- **UI selectors fail after a Vikunja upgrade** — components prefer
  ARIA roles; if upstream rewrites the DOM, the locators in
  [components/](components/) are usually the only place to touch.
- **Watch the suite run** — `npm test -- --headed --workers=1`.
- **Slow motion** — `$env:SLOW_MO="500"` before the command.
- **`PWDEBUG=1 npm test`** opens the inspector for any failing test.
- **`npm run report`** opens the last HTML report (traces, screenshots,
  videos on failure).
