# Vikunja QA Framework — TypeScript + Playwright

This project contains the end-to-end testing framework used for the Vikunja application located in `../application`.

The framework was built around Playwright and TypeScript with a focus on maintainability, reusable components, fast execution, and stable test setup. Besides covering the original assignment requirements, the project also includes additional improvements like API-based authentication, reusable UI components, self-healing auth state handling, and parameterized test structures.

---

# 1. Stack & Tools

| Tool       | Version            |
| ---------- | ------------------ |
| TypeScript | 5.7+               |
| Playwright | ^1.49.1            |
| Node.js    | 18+ (tested on 22) |
| zod        | 3.24+              |

Browser binaries can be installed using:

```bash
npm run install:browsers
```

---

# 2. Running the Project

## Prerequisites

Start the Vikunja application first:

```bash
cd ../application
docker-compose up -d
```

Make sure the app is available at:

```text
http://localhost:8080
```

Then install dependencies inside the QA project:

```bash
cd ../qa
npm install
npm run install:browsers
```

---

## Test Commands

| Purpose              | Command                            |
| -------------------- | ---------------------------------- |
| Run full suite       | `npm test`                         |
| Run headed mode      | `npm test -- --headed --workers=1` |
| Open HTML report     | `npm run report` *(includes traces, screenshots, videos for failed tests, and the execution timeline)* |
| Run smoke tests only | `npm run test:smoke`               |
| Playwright UI mode   | `npm run test:ui`                  |
| Record interactions  | `npm run codegen`                  |
| Debug mode           | `npm run test:debug`               |
| Type-check project   | `npm run lint`                     |

---

## Run Individual Specs

```bash
npm run test:signup
npm run test:login
npm run test:logout
npm run test:dashboard
npm run test:overview
npm run test:upcoming
npm run test:projects
npm run test:project-details
npm run test:labels
npm run test:teams
npm run test:inbox
```

---

## Switching Environments

The framework supports multiple environments through dedicated config files.

```bash
npm run test:dev
npm run test:staging
npm run test:prod
```

Configuration values are validated before tests start, so invalid or missing settings fail immediately with a readable error.

---

## Slow Motion / Watching Execution

Example:

```powershell
$env:SLOW_MO="500"
npm run test:project-details -- --headed --workers=1
```

This adds a small delay between actions which helps when visually following the test flow.

---

# 3. Project Structure

```text
qa/
├─ components/
├─ config/
├─ fixtures/
├─ pages/
├─ tests/
├─ playwright.config.ts
├─ tsconfig.json
├─ package.json
└─ README.md
```

### Main folders

* `components/`
  Reusable UI sections such as sidebar, navbar, dialogs, task lists, and menus.

* `pages/`
  Page objects representing application pages.

* `fixtures/`
  Shared Playwright fixtures, API clients, factories, and authentication setup.

* `config/`
  Environment configuration and validation logic.

* `tests/`
  All Playwright spec files.

---

# 4. Architecture & Design

## Component-Based Structure

Instead of placing all selectors directly inside page objects, reusable UI parts are separated into independent components.

Examples:

* Sidebar
* Navbar
* Project modals
* Task lists
* Dialogs

Pages simply compose these components depending on what they need.

This keeps the framework easier to maintain as the application grows.

---

## API + UI Combination

The framework uses the API heavily for setup and validation.

Examples:

* Create users through API before login tests
* Seed projects/tasks through API before UI checks
* Verify UI actions directly against backend responses

This keeps tests faster and more reliable compared to doing everything through the UI.

---

## Authentication Strategy

Authentication is handled through API requests instead of logging in through the browser for every test.

The framework:

1. Calls `/api/v1/login`
2. Stores the JWT
3. Injects it into local storage
4. Reuses cached auth state when valid

The cached state is also validated automatically and recreated if it becomes invalid.

---

## Configuration Handling

Configuration values are merged from:

1. Default values
2. Environment-specific config
3. Environment variables

Everything is validated with zod before execution starts.

---

# 5. CRUD Coverage

The project includes complete CRUD coverage for Projects and partial CRUD coverage for Tasks.

| Resource | Create | Read | Update | Delete  |
| -------- | ------ | ---- | ------ | ------- |
| Projects | ✅      | ✅    | ✅      | ✅       |
| Tasks    | ✅      | ✅    | ✅      | Partial |
| Users    | ✅      | ✅    | n/a    | n/a     |

---

# 6. Test Coverage

The suite currently contains more than 80 tests across 11 spec files.

| Spec                                 | Coverage                                                                                                                                                                                 | Tests |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----: |
| `tests/signup.spec.ts`               | UI register, duplicate-username error, navigate to login, button-disabled validation, per-field errors, invalid-email rejection                                                          |     8 |
| `tests/login.spec.ts`                | Login by username, login by email, wrong password, unknown username, unknown email, empty-field errors, stay-logged-in toggle, JWT-lifetime finding (`test.fail`), forgot-password, link to register |    12 |
| `tests/logout.spec.ts`               | Logout returns to `/login`, protected route re-redirects after logout                                                                                                                    |     2 |
| `tests/dashboard.spec.ts`            | Shell visibility, sidebar items visible + clickable, navbar items visible + clickable, account-menu entries, interactive actions                                                         |    19 |
| `tests/overview.spec.ts`             | Sidebar navigation + shared shell                                                                                                                                                        |     2 |
| `tests/upcoming.spec.ts`             | Sidebar navigation + shared shell                                                                                                                                                        |     2 |
| `tests/labels.spec.ts`               | Sidebar navigation + shared shell                                                                                                                                                        |     2 |
| `tests/teams.spec.ts`                | Sidebar navigation + shared shell                                                                                                                                                        |     2 |
| `tests/inbox.spec.ts`                | Sidebar navigation + shared shell                                                                                                                                                        |     2 |
| `tests/projects.spec.ts`             | New-project trigger, modal opens, UI create, multiple in sequence, input validation, API empty-title rejection                                                                           |    10 |
| `tests/project-details.spec.ts`      | Task creation (single, multiple, API↔UI), open task and mark done via task details page, views (Table + Kanban) render and reflect done state, edit + delete project across UI and API   |    15 |

---

# 7. Notes & Findings

A few interesting behaviors were noticed while building the framework:

* The "Stay logged in" checkbox in Vikunja v2.3.0 does not appear to affect JWT expiration.
* The login button stays enabled even with empty fields.
* The "New Project" modal only includes title, parent project, and color fields.
* Project creation and project editing use different input selectors internally.
* Task checkboxes are implemented as custom SVG elements instead of native checkboxes.

These observations are documented directly inside the tests as part of the suite.

---

# 8. Troubleshooting

### Invalid configuration

If you see:

```text
Invalid configuration for TEST_ENV
```

check the files inside `config/` or your environment variables.

---

### Connection refused

If tests fail with `ECONNREFUSED`, verify the application is running:

```bash
docker-compose ps
```

---

### Auth issues

Authentication cache is automatically refreshed when invalid, so manual cleanup is usually unnecessary.

---

### UI selector failures

If a future Vikunja update changes the UI structure, selectors are mostly centralized inside the `components/` folder, making updates easier.
