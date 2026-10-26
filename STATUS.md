# Workboard — Status

Living snapshot of where the project is. **Update this file whenever you finish meaningful work**,
alongside the relevant tickets. The generated [`BACKLOG.md`](BACKLOG.md) is the detailed ticket index.

_Last updated: 2026-10-26_

## Where we are

Workboard is **feature-complete as a portfolio app**: projects & tasks CRUD, epics with roll-up
progress, sub-tasks with progress, Kanban + list + month/week calendar + timeline/roadmap views, advanced filtering
with URL state, labels, saved views, trash with undo, bulk actions, command palette + keyboard
shortcuts, theme support, JSON import/export, CSV and Markdown snapshots, a printable board and task
list, WCAG 2.2 AA target, and a full test/CI setup. It is local-first (IndexedDB + localStorage
fallback) with no backend.

The project now **manages itself with Workboard** and is documented for AI agent teams
(see [`AGENTS.md`](AGENTS.md) and [`docs/project-management.md`](docs/project-management.md)).

## Recently completed

| Date       | Work                                                             | Ticket                                                 |
| ---------- | ---------------------------------------------------------------- | ------------------------------------------------------ |
| 2026-10-26 | Timeline/roadmap: project rows, zoom, today marker, URL filters  | [WB-203](tickets/WB-203-timeline-view.md)              |
| 2026-10-26 | Mobile Kanban E2E: touch fallback + keyboard parity              | [WB-508](tickets/WB-508-mobile-dnd-e2e.md)             |
| 2026-10-26 | Data-driven E2E specs: removed seeded ticket fixtures            | [WB-509](tickets/WB-509-e2e-data-driven.md)            |
| 2026-10-26 | Calendar view: month/week grids, project colours, URL state      | [WB-202](tickets/WB-202-calendar-view.md)              |
| 2026-10-26 | CSV/Markdown exports, keyboard-triggered downloads, print layout | [WB-104](tickets/WB-104-csv-markdown-export.md)        |
| 2026-10-16 | Task dependencies: "blocked by" with cycle prevention + filter   | [WB-103](tickets/WB-103-task-dependencies.md)          |
| 2026-10-16 | Sync spike: options report, ADR, and a working API-backed repo   | [WB-201](tickets/WB-201-sync-spike.md)                 |
| 2026-10-16 | Virtualized lists + paged repository query; 50k-task benchmark   | [WB-403](tickets/WB-403-virtualization-scale.md)       |
| 2026-10-16 | Dev reseed: the backlog returns whenever a dev app is empty      | [WB-507](tickets/WB-507-dev-reseed.md)                 |
| 2026-10-15 | Dev-only seed of Workboard's own backlog; demo data removed      | [WB-506](tickets/WB-506-dev-seed-workboard-backlog.md) |
| 2026-10-15 | Epics / milestones with roll-up progress + epic filter           | [WB-401](tickets/WB-401-epics-milestones.md)           |
| 2026-10-15 | Sub-tasks (parent/child) with progress + cascade delete          | [WB-102](tickets/WB-102-sub-tasks.md)                  |
| 2026-10-14 | Labels + saved views now round-trip through export/import        | [WB-404](tickets/WB-404-export-labels-saved-views.md)  |
| 2026-10-14 | Applied saved views on the Tasks page + tag filtering            | [WB-101](tickets/WB-101-finish-saved-views.md)         |
| 2026-10-14 | Competitor analysis (Jira, Trello, Linear) + README link         | [WB-501](tickets/WB-501-competitor-analysis.md)        |
| 2026-10-14 | Ticket system, deterministic generator, machine-readable backlog | [WB-502](tickets/WB-502-ticket-system.md)              |
| 2026-10-14 | `AGENTS.md`, project-management workflow, this status doc        | [WB-503](tickets/WB-503-agents-md-workflow.md)         |
| 2026-10-14 | CI enforcement of ticket/backlog sync                            | [WB-504](tickets/WB-504-ci-ticket-sync.md)             |
| 2026-10-14 | Workboard export → ticket sync script                            | [WB-505](tickets/WB-505-workboard-sync.md)             |

## In progress

_None._ Pick from the next-up list below.

## Next up (highest priority)

| ID                                    | Title               | Why now                                 |
| ------------------------------------- | ------------------- | --------------------------------------- |
| [WB-204](tickets/WB-204-reporting.md) | Add basic reporting | Completes the Tier 2 view/reporting set |

## Metrics

| Metric               | Value                          | Source                  |
| -------------------- | ------------------------------ | ----------------------- |
| Unit/component tests | 513 passing                    | `npm run test:run`      |
| E2E tests            | 177 passing, 1 skipped         | `npm run test:e2e`      |
| Coverage             | 87.30% stmts / 79.94% branches | `npm run test:coverage` |
| Bundle budget        | 180.82 kB gzip JS (≤200 KB)    | `npm run size`          |
| Backlog              | 29 tickets, 9 open / 20 done   | `BACKLOG.md`            |

## Known limitations

- No backend, accounts, collaboration, or sync. The path to optional sync has been de-risked and
  documented ([ADR 0001](docs/decisions/0001-sync-architecture.md), [WB-201](tickets/WB-201-sync-spike.md)),
  but nothing is wired in — local-only remains the default.
- List rendering is virtualized and benchmarked to 50,000 tasks; filtering/sorting still run in memory
  ([WB-403](tickets/WB-403-virtualization-scale.md), [docs/performance.md](docs/performance.md)).
