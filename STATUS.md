# Workboard — Status

Living snapshot of where the project is. **Update this file whenever you finish meaningful work**,
alongside the relevant tickets. The generated [`BACKLOG.md`](BACKLOG.md) is the detailed ticket index.

_Last updated: 2026-10-15_

## Where we are

Workboard is **feature-complete as a portfolio app**: projects & tasks CRUD, epics with roll-up
progress, sub-tasks with progress, Kanban + list views, advanced filtering with URL state, labels,
saved views, trash with undo, bulk actions, command palette + keyboard shortcuts, theme support,
JSON import/export, WCAG 2.2 AA target, and a full test/CI setup. It is local-first (IndexedDB +
localStorage fallback) with no backend.

The project now **manages itself with Workboard** and is documented for AI agent teams
(see [`AGENTS.md`](AGENTS.md) and [`docs/project-management.md`](docs/project-management.md)).

## Recently completed

| Date       | Work                                                             | Ticket                                                |
| ---------- | ---------------------------------------------------------------- | ----------------------------------------------------- |
| 2026-10-15 | Epics / milestones with roll-up progress + epic filter           | [WB-401](tickets/WB-401-epics-milestones.md)          |
| 2026-10-15 | Sub-tasks (parent/child) with progress + cascade delete          | [WB-102](tickets/WB-102-sub-tasks.md)                 |
| 2026-10-14 | Labels + saved views now round-trip through export/import        | [WB-404](tickets/WB-404-export-labels-saved-views.md) |
| 2026-10-14 | Applied saved views on the Tasks page + tag filtering            | [WB-101](tickets/WB-101-finish-saved-views.md)        |
| 2026-10-14 | Competitor analysis (Jira, Trello, Linear) + README link         | [WB-501](tickets/WB-501-competitor-analysis.md)       |
| 2026-10-14 | Ticket system, deterministic generator, machine-readable backlog | [WB-502](tickets/WB-502-ticket-system.md)             |
| 2026-10-14 | `AGENTS.md`, project-management workflow, this status doc        | [WB-503](tickets/WB-503-agents-md-workflow.md)        |
| 2026-10-14 | CI enforcement of ticket/backlog sync                            | [WB-504](tickets/WB-504-ci-ticket-sync.md)            |
| 2026-10-14 | Workboard export → ticket sync script                            | [WB-505](tickets/WB-505-workboard-sync.md)            |

## In progress

_None._ Pick from the next-up list below.

## Next up (highest priority)

| ID                                                 | Title                    | Why now                        |
| -------------------------------------------------- | ------------------------ | ------------------------------ |
| [WB-403](tickets/WB-403-virtualization-scale.md)   | Virtualize long lists    | Removes the ~10k-task ceiling  |
| [WB-601](tickets/WB-601-select-datepicker-a11y.md) | Select + DatePicker a11y | Closes high-severity a11y debt |

## Metrics

| Metric               | Value                         | Source                  |
| -------------------- | ----------------------------- | ----------------------- |
| Unit/component tests | 361 passing                   | `npm run test:run`      |
| E2E tests            | 156 passing, 2 skipped        | `npm run test:e2e`      |
| Coverage             | 84.0% stmts / 76.7% branches  | `npm run test:coverage` |
| Bundle budget        | ≤100 KB gzip JS               | `npm run size`          |
| Backlog              | 26 tickets, 16 open / 10 done | `BACKLOG.md`            |

## Known limitations

- No backend, accounts, collaboration, or sync.
- ~10,000 tasks before performance degrades ([WB-403](tickets/WB-403-virtualization-scale.md)).
