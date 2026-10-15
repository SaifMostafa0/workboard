# AGENTS.md

Guidance for AI agents (and humans) working in this repository. Keep it short and current; deeper
detail lives in the linked docs.

## What this is

**Workboard** — a local-first, offline, single-user project & task management app built as a
portfolio-grade engineering project. React 18 + TypeScript + Vite, React Router, TanStack Query,
React Hook Form + Zod, IndexedDB (with localStorage fallback). No backend, no accounts, no sync.

- Architecture: [`docs/architecture.md`](docs/architecture.md)
- Engineering decisions: [`CASE_STUDY.md`](CASE_STUDY.md)
- Market context: [`COMPETITOR_ANALYSIS.md`](COMPETITOR_ANALYSIS.md)
- Current state: [`STATUS.md`](STATUS.md)
- Backlog: [`BACKLOG.md`](BACKLOG.md)
- **How work is tracked (read this):** [`docs/project-management.md`](docs/project-management.md)

## Golden rules

1. **Docs and tickets are part of the work, not an afterthought.** A change is not done until the
   relevant markdown is updated. See the definition of done in `docs/project-management.md`.
2. **`tickets/WB-*.md` are the source of truth.** `BACKLOG.md` and
   `project-management/workboard-import.json` are generated — never hand-edit them.
3. **After changing tickets, run `npm run tickets:build`** and commit the regenerated artifacts.
   CI runs `npm run tickets:check` and fails on drift.
4. **Keep changes consistent** with surrounding code: naming, structure, CSS modules, tests.
5. **No `any`.** Use `unknown` + Zod validation at boundaries. Business rules live in pure domain
   functions. Storage goes through repositories that return `Result<T, E>` discriminated unions.
6. **Work from a ticket.** If none fits, create one before writing code.

## Commands

| Command                       | Purpose                                                                 |
| ----------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`                 | Dev server at http://localhost:5173                                     |
| `npm run build`               | Type-check + production build                                           |
| `npm run preview`             | Preview the production build                                            |
| `npm run lint`                | ESLint (0 warnings tolerated)                                           |
| `npm run typecheck`           | TypeScript (app + tests)                                                |
| `npm run test:run`            | Unit/component tests once                                               |
| `npm run test:coverage`       | Tests with coverage                                                     |
| `npm run test:e2e`            | Playwright E2E (starts the dev server, seeded with this repo's backlog) |
| `npm run ci`                  | Full local gate (format, lint, typecheck, tickets, tests, build, e2e)   |
| `npm run tickets:build`       | Regenerate `BACKLOG.md` + `workboard-import.json`                       |
| `npm run tickets:check`       | Fail if generated artifacts are stale                                   |
| `npm run tickets:sync <file>` | Fold a Workboard export back into ticket frontmatter                    |

## Repository map

```
src/
  app/             app shell, routing, providers
  components/      shared UI (ui/, layout/, command-palette/, feedback/)
  features/        dashboard, projects, tasks, trash, labels, saved-views, settings
  domain/          pure types + Zod schemas + business rules (no React)
  infrastructure/  storage adapters + repositories
  hooks/           React Query hooks over repositories
  lib/             utilities (date, id, format, hotkeys)
  styles/          global styles + design tokens
tickets/           canonical backlog (WB-*.md)
project-management/ Workboard config + generated import + ticket schema
docs/              architecture, testing, a11y, performance, project-management
e2e/               Playwright specs
scripts/           Node tooling (bundle size, ticket build/sync)
```

## Architecture conventions

- Layering: **UI → hooks → domain → repositories → storage adapter**. UI never touches storage.
- Errors: repository/storage return `Result<T, E>`; hooks translate to toasts; forms use inline field errors.
- Validation: Zod schemas are the single source of truth for input and imported data.
- Dates: ISO timestamps; due dates are calendar dates (`YYYY-MM-DD`); use `src/lib/date.ts`.
- Filtering/sorting/pagination are pure domain functions run client-side; filter state lives in the URL.
- Styling: CSS Modules with design tokens; no CSS-in-JS runtime.
- A11y: WCAG 2.2 AA target; semantic HTML, focus management, live regions, axe in E2E.

## Definition of done (short form)

- [ ] Acceptance criteria met
- [ ] `npm run lint`, `npm run typecheck`, `npm run test:run` pass
- [ ] Tests added/updated; a11y considered for UI
- [ ] Docs/tickets updated and `npm run tickets:build` run

## Picking up a ticket

1. Read this file and `docs/project-management.md`.
2. Pick the highest-priority unblocked ticket in `BACKLOG.md` / `tickets/`.
3. Set it to `status: in_progress`, `assignee: agent:<you>`, bump `updated`.
4. Implement, run the gates, update docs.
5. Mark `done`, add an `## Updates` entry, run `npm run tickets:build`.

## Guardrails

- Do not edit `BACKLOG.md` or `project-management/workboard-import.json` by hand.
- Do not rename a ticket file without updating its `id`.
- Do not commit build/test output (`dist`, `coverage`, `playwright-report`, `test-results`).
- Do not add dependencies casually — the bundle budget is ≤100 KB gzip JS.
