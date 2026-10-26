# Workboard — Testing Strategy

## Testing Pyramid

```
         /\
        /  \     E2E Tests (Playwright) — 10-15 tests
       /----\    Critical user journeys, real browser
      /      \
     /--------\  Integration Tests (Vitest + RTL) — 50-80 tests
    /          \ Hooks, components with real repositories
   /------------\
  /              \ Unit Tests (Vitest) — 100+ tests
 /----------------\ Pure functions, domain logic, validation
```

## Test Categories

### 1. Unit Tests — Domain & Infrastructure

**Location**: `src/domain/**/*.test.ts`, `src/infrastructure/**/*.test.ts`, `src/lib/**/*.test.ts`
**Tools**: Vitest
**Target**: ≥80% statements, ≥75% branches for domain/repo code

#### Domain Functions to Test

| Function                               | Test Cases                                                |
| -------------------------------------- | --------------------------------------------------------- |
| `calculateCompletionPercentage(tasks)` | Empty, all done, mixed, all todo                          |
| `isOverdue(task, refDate)`             | Past due, today, future, no due date, completed           |
| `filterTasks(tasks, filters)`          | Each filter alone, combined AND, case-insensitive text    |
| `sortTasks(tasks, config)`             | Each field asc/desc, stable sort, null handling           |
| `paginate(items, page, size)`          | First, middle, last, oversized page, empty                |
| `validateProject(input)`               | Valid, empty name, too long, duplicate (repo level)       |
| `validateTask(input)`                  | Valid, missing title, invalid projectId, bad priority     |
| `validateImport(data)`                 | Valid, oversized, bad schema, orphan tasks, duplicate IDs |
| `migrateV1toV2(data)`                  | Valid v1, missing fields, corrupted                       |

#### Repository Tests

- Use `FakeStorageAdapter` (in-memory Map implementation)
- Test: CRUD, cascade delete, query with filters, migration trigger
- Error cases: quota, corrupted, not found

### 2. Integration Tests — Hooks & Components

**Location**: `src/features/*/hooks/*.test.ts`, `src/features/*/components/*.test.tsx`
**Tools**: Vitest + React Testing Library + `@testing-library/user-event`

#### Hook Tests

| Hook                 | Scenarios                                      |
| -------------------- | ---------------------------------------------- |
| `useProjects()`      | Load, create, update, delete, error states     |
| `useProject(id)`     | Load single, not found, update                 |
| `useTasks(filters)`  | Load, filter changes, sort changes, pagination |
| `useTask(id)`        | Load, status change, optimistic update         |
| `useCreateTask()`    | Success, validation error, storage error       |
| `useDeleteProject()` | Confirm, cascade tasks, cancel, error          |

#### Component Tests

| Component       | Key Interactions                                           |
| --------------- | ---------------------------------------------------------- |
| `ProjectForm`   | Submit valid, show field errors, preserve input, cancel    |
| `TaskForm`      | All fields, status select, priority, tags, due date picker |
| `ProjectList`   | Search, empty state, delete confirmation                   |
| `TaskList`      | Inline status change, row click → detail, multi-select     |
| `FilterToolbar` | Each filter type, clear all, URL sync                      |
| `Pagination`    | Page change, size change, boundary disabled                |
| `ConfirmDialog` | Keyboard (Esc, Enter), focus trap, cancel/confirm          |
| `Toast`         | Auto-dismiss, action button, stacking                      |

#### Accessibility Tests (Integrated)

- `expect(element).toHaveAccessibleName()`
- `expect(getByRole('button')).toBeFocusable()`
- Tab order verification
- `axe-core` snapshot for key pages

### 3. End-to-End Tests — Playwright

**Location**: `e2e/*.spec.ts`
**Target**: All critical user journeys

#### Test Scenarios

```typescript
// e2e/dashboard.spec.ts
test('First launch shows the seeded Workboard backlog');

// e2e/projects.spec.ts
test('Create project → appears in list → navigate to detail');
test('Edit project name and color');
test('Delete project → confirms → cascade deletes tasks');
test('Search projects by name');

// e2e/tasks.spec.ts
test('Create task with all fields in project detail');
test('Edit task → change status, priority, due date, tags');
test('Delete task with confirmation');
test('Mark task complete → shows completedAt timestamp');

// e2e/filters.spec.ts
test('Text search filters title and description');
test('Combined filters: project + status + priority');
test('Sort by due date ascending/descending');
test('Pagination resets when filters change');
test('Clear all filters restores full list');
test('URL updates with filter state → direct load works');

// e2e/kanban-dnd.spec.ts
test('Desktop drag moves a card between columns');
test('Touch devices move a card with the status control');
test('Keyboard moves a card with the status control');

// e2e/persistence.spec.ts
test('Reload page → data persists');
test('Import valid JSON → merges data');
test('Import invalid JSON → shows error, no data loss');
test('Export JSON → valid schema');

// e2e/navigation.spec.ts
test('Direct load /projects/:id shows project detail');
test('Direct load /tasks?status=done shows filtered list');
test('Keyboard navigation: Tab, Enter, Esc in dialogs');
test('Browser back/forward preserves state');

// e2e/error-recovery.spec.ts
test('Simulated storage failure → shows retry, recovers');
test('Network failure simulation (future API)');
```

#### E2E Test Infrastructure

```typescript
// e2e/fixtures.ts
import { test as base } from '@playwright/test';

export const test = base.extend<{
  cleanStorage: void;
}>({
  cleanStorage: async ({ page }, use) => {
    await page.goto('/');
    await page.evaluate(() => {
      indexedDB.deleteDatabase('workboard');
      localStorage.clear();
    });
    await page.reload();
    await use();
  },
});

// Each test gets isolated storage
```

#### Kanban drag and drop on touch

The board uses native HTML5 drag events on desktop. Touch browsers do not expose that pipeline to
scripts, so the supported mobile interaction is the **Start** / **Complete** status button on each
card — the same control that provides the keyboard alternative. The E2E spec branches on the
Playwright device rather than skipping mobile: desktop dispatches drag events, mobile clicks the
status button, and a separate test drives it with the keyboard.

#### Timeline / roadmap

The timeline's date maths is a pure domain model (`src/domain/timeline.ts`): window construction,
date-to-percentage placement, tick generation, and lane packing for overlapping bars. Unit tests
cover day/week/month ranges, zoom navigation, edge dates, filters, empty projects, undated tasks,
and out-of-window tasks. The Playwright journey creates a task with a due date, then exercises the
rendered bar, range navigation, all zoom levels, project/status filters, keyboard focus, and the
existing edit dialog.

#### Reports

Reporting maths lives in `src/domain/reporting.ts` with an injected `now` and fixed timestamp
fixtures. Unit tests cover the 4/8/12-week range model, completed-task boundaries, weekly throughput,
overdue snapshots (including tasks completed later), per-project averages, ungrouped/deleted
projects, invalid timestamps, and empty data. The Playwright specs read the rendered metrics and
weekly table instead of assuming seeded values: one creates a task marked done and checks the
throughput total and current-week row increase; another advances the browser clock past midnight
and checks an open due-today task becomes overdue. Chart bars are keyboard-operable and the same
numbers are available in tables for every range.

#### Accessibility (axe)

`e2e/accessibility.spec.ts` runs [axe-core](https://github.com/dequelabs/axe-core) against
every page (Dashboard, Projects, Tasks, Calendar, Timeline, Reports, Trash, Settings) and fails on
any WCAG 2.1 A/AA violation. Colour-contrast and landmark/label regressions are therefore caught
in CI.

### 4. Visual Regression (Optional)

- Playwright screenshot comparison for key pages
- Run in CI on Chromium only
- Update baseline manually after design changes

## Test Data Strategy

### Factories (`src/test/factories/`)

```typescript
// Pure functions returning valid domain objects
export const createProject = (overrides?: Partial<Project>): Project => ({
  id: crypto.randomUUID(),
  name: 'Test Project',
  description: '',
  color: 'blue',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createTask = (overrides?: Partial<Task>): Task => ({
  id: crypto.randomUUID(),
  projectId: 'project-1',
  title: 'Test Task',
  description: '',
  status: 'todo',
  priority: 'medium',
  tags: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});
```

### Fixtures (`src/test/fixtures/`)

```typescript
// Pre-built scenarios for integration/E2E tests
export const demoProjects: Project[] = [...];
export const demoTasks: Task[] = [...];
export const emptyState = { projects: [], tasks: [] };
export const overdueScenario = { projects: [...], tasks: [...] };
```

## Running Tests

### Local Development

```bash
# Unit + Integration
npm run test              # Watch mode
npm run test:run          # Single run
npm run test:coverage     # With coverage report
npm run test:ui           # Vitest UI

# E2E
npm run test:e2e          # Headless
npm run test:e2e:ui       # Playwright UI
npm run test:e2e:headed   # Headed browser
```

### CI Pipeline

CI is defined in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). It runs two jobs:
a `quality` job (format → lint → typecheck → unit/integration with coverage → build)
and an `e2e` job that installs Chromium and runs Playwright against the production build.
Node is pinned via `.nvmrc`. Superseded runs on the same ref are cancelled, and the
coverage + Playwright reports are uploaded as artifacts.

```yaml
# .github/workflows/ci.yml (abridged)
jobs:
  quality:
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: npm }
      - run: npm ci
      - run: npm run format:check
      - run: npm run lint
      - run: npm run typecheck # app + test projects
      - run: npm run test:run -- --coverage
      - run: npm run build
  e2e:
    needs: quality
    steps:
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npm run test:e2e
```

## Coverage Thresholds (vitest.config.ts)

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
      // Enforce on pure logic: domain, repositories/storage and lib.
      include: ['src/domain/**', 'src/infrastructure/**', 'src/lib/**'],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        'src/test/**',
        'src/**/index.ts', // barrels only re-export
        'src/infrastructure/storage/indexedDBAdapter.ts', // browser shim, covered by E2E
      ],
    },
  },
});
```

## Quality Gates

| Gate              | Tool                        | Threshold                 |
| ----------------- | --------------------------- | ------------------------- |
| TypeScript (app)  | `tsc -b`                    | 0 errors                  |
| TypeScript (test) | `tsc -p tsconfig.test.json` | 0 errors                  |
| Lint              | ESLint                      | 0 errors, 0 warnings      |
| Format            | Prettier                    | 0 changes                 |
| Unit/Integration  | Vitest                      | All pass, coverage met    |
| E2E               | Playwright                  | All pass                  |
| Build             | Vite                        | Success                   |
| A11y              | axe-core (in E2E)           | 0 violations on key pages |

## Test Naming Conventions

```typescript
// Unit: describe function, test behavior
describe('calculateCompletionPercentage', () => {
  test('returns 0 for empty array');
  test('returns 100 when all tasks done');
  test('returns 50 for mixed done/todo');
});

// Integration: describe hook/component, test user flow
describe('useProjects', () => {
  test('creates project and updates list optimistically');
  test('shows error toast when storage fails');
});

// E2E: test user-visible scenario
test('User can create a project and see it in the list', async ({ page }) => {
  // ...
});
```

## Mocking Strategy

| Dependency                   | Approach                                      |
| ---------------------------- | --------------------------------------------- |
| `localStorage` / `indexedDB` | Fake adapter in-memory (not jest mocks)       |
| `crypto.randomUUID`          | Deterministic sequence in tests               |
| `Date.now` / `new Date()`    | `vi.useFakeTimers()` for time-sensitive tests |
| `fetch` / API                | MSW (Mock Service Worker) when API introduced |
| React Query                  | `createWrapper` with test QueryClient         |

## Debugging Failed Tests

1. **Unit**: `npm run test:run -- --reporter=verbose`
2. **Integration**: `npm run test:ui` → inspect component tree
3. **E2E**: `npm run test:e2e:headed` → watch browser
4. **CI**: Download Playwright trace.zip artifact

## Anti-Patterns to Avoid

- ❌ Testing implementation details (private functions, state shape)
- ❌ Snapshots for dynamic content (use specific assertions)
- ❌ Shared mutable state between tests (use factories)
- ❌ `act()` warnings — use `waitFor` / `findBy` queries
- ❌ Testing library internals (React Query cache structure)
- ❌ Flaky timing — use `waitFor` with explicit conditions
