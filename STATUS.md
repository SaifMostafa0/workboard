# Workboard — Status

Living snapshot of where the project is. **Update this file whenever you finish meaningful work**,
alongside the relevant tickets. The generated [`BACKLOG.md`](BACKLOG.md) is the detailed ticket index.

_Last updated: 2026-10-28_

## Where we are

Workboard is **feature-complete as a portfolio app**: projects & tasks CRUD, epics with roll-up
progress, sub-tasks with progress and dependencies, Kanban + list + month/week calendar +
timeline/roadmap and reporting views, advanced filtering with URL state, labels, saved views, trash
with undo, bulk actions, command palette + keyboard shortcuts, theme support, JSON import/export,
CSV and Markdown snapshots, a printable board and task list, comments with a per-task activity feed,
locally stored attachments, recurring tasks, due-date reminders, and an installable offline PWA with
optional passphrase-encrypted backups. WCAG 2.2 AA target and a full test/CI setup. It is local-first
(IndexedDB + localStorage fallback) with no backend.

The project now **manages itself with Workboard** and is documented for AI agent teams
(see [`AGENTS.md`](AGENTS.md) and [`docs/project-management.md`](docs/project-management.md)).

## Recently completed

| Date       | Work                                                               | Ticket                                                 |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| 2026-10-28 | Comments + per-task activity feed, empty states, a11y list/time    | [WB-402](tickets/WB-402-comments-activity.md)          |
| 2026-10-28 | Installable PWA, offline deep links, update prompt, AES-256 backup | [WB-305](tickets/WB-305-pwa-encrypted-backup.md)       |
| 2026-10-28 | Due-date reminders: centre, lead time, opt-in notifications        | [WB-303](tickets/WB-303-reminders.md)                  |
| 2026-10-28 | Recurring tasks: daily/weekly/monthly, next-occurrence scheduling  | [WB-302](tickets/WB-302-recurring-tasks.md)            |
| 2026-10-28 | Local attachments: IndexedDB blobs, quotas, safe downloads         | [WB-301](tickets/WB-301-file-attachments.md)           |
| 2026-10-28 | Public API/webhooks spike; deferred to post-MVP (ADR 0002)         | [WB-304](tickets/WB-304-public-api.md)                 |
| 2026-10-26 | Coverage gate: label/saved-view paths, 85% branch threshold        | [WB-603](tickets/WB-603-raise-coverage.md)             |
| 2026-10-26 | Lighthouse CI gate: median budgets, preview audits, bundle check   | [WB-602](tickets/WB-602-lighthouse-ci-gate.md)         |
| 2026-10-26 | Reports: throughput, cycle time, overdue trend, 4/8/12 weeks       | [WB-204](tickets/WB-204-reporting.md)                  |
| 2026-10-26 | Timeline/roadmap: project rows, zoom, today marker, URL filters    | [WB-203](tickets/WB-203-timeline-view.md)              |
| 2026-10-26 | Mobile Kanban E2E: touch fallback + keyboard parity                | [WB-508](tickets/WB-508-mobile-dnd-e2e.md)             |
| 2026-10-26 | Data-driven E2E specs: removed seeded ticket fixtures              | [WB-509](tickets/WB-509-e2e-data-driven.md)            |
| 2026-10-26 | Calendar view: month/week grids, project colours, URL state        | [WB-202](tickets/WB-202-calendar-view.md)              |
| 2026-10-26 | CSV/Markdown exports, keyboard-triggered downloads, print layout   | [WB-104](tickets/WB-104-csv-markdown-export.md)        |
| 2026-10-16 | Task dependencies: "blocked by" with cycle prevention + filter     | [WB-103](tickets/WB-103-task-dependencies.md)          |
| 2026-10-16 | Sync spike: options report, ADR, and a working API-backed repo     | [WB-201](tickets/WB-201-sync-spike.md)                 |
| 2026-10-16 | Virtualized lists + paged repository query; 50k-task benchmark     | [WB-403](tickets/WB-403-virtualization-scale.md)       |
| 2026-10-16 | Dev reseed: the backlog returns whenever a dev app is empty        | [WB-507](tickets/WB-507-dev-reseed.md)                 |
| 2026-10-15 | Dev-only seed of Workboard's own backlog; demo data removed        | [WB-506](tickets/WB-506-dev-seed-workboard-backlog.md) |
| 2026-10-15 | Epics / milestones with roll-up progress + epic filter             | [WB-401](tickets/WB-401-epics-milestones.md)           |
| 2026-10-15 | Sub-tasks (parent/child) with progress + cascade delete            | [WB-102](tickets/WB-102-sub-tasks.md)                  |
| 2026-10-14 | Labels + saved views now round-trip through export/import          | [WB-404](tickets/WB-404-export-labels-saved-views.md)  |
| 2026-10-14 | Applied saved views on the Tasks page + tag filtering              | [WB-101](tickets/WB-101-finish-saved-views.md)         |
| 2026-10-14 | Competitor analysis (Jira, Trello, Linear) + README link           | [WB-501](tickets/WB-501-competitor-analysis.md)        |
| 2026-10-14 | Ticket system, deterministic generator, machine-readable backlog   | [WB-502](tickets/WB-502-ticket-system.md)              |
| 2026-10-14 | `AGENTS.md`, project-management workflow, this status doc          | [WB-503](tickets/WB-503-agents-md-workflow.md)         |
| 2026-10-14 | CI enforcement of ticket/backlog sync                              | [WB-504](tickets/WB-504-ci-ticket-sync.md)             |
| 2026-10-14 | Workboard export → ticket sync script                              | [WB-505](tickets/WB-505-workboard-sync.md)             |

## In progress

_None._ Pick from the next-up list below.

## Next up (highest priority)

_No open tickets in the current backlog._ The roadmap through tier 3 is complete. Natural next
candidates (not yet ticketed): Web Push for reminders when the tab is closed, attachment backup/export
(the deferred part of [WB-404](tickets/WB-404-export-labels-saved-views.md)), and the public API /
webhooks design from [ADR 0002](docs/decisions/0002-public-api-and-webhooks.md) if the project ever
gains a backend.

## Metrics

| Metric               | Value                                   | Source                  |
| -------------------- | --------------------------------------- | ----------------------- |
| Unit/component tests | 711 passing                             | `npm run test:run`      |
| E2E tests            | 185 passing, 1 skipped                  | `npm run test:e2e`      |
| Coverage             | 92.34% stmts / 86.23% branches          | `npm run test:coverage` |
| Lighthouse baseline  | 96 / 100 / 100 / 100 (perf/a11y/BP/SEO) | Lighthouse CI           |
| Bundle budget        | 196.55 kB JS / 16.76 kB CSS gzip        | `npm run size`          |
| Backlog              | 29 tickets, 0 open / 29 done            | `BACKLOG.md`            |

## Known limitations

- No backend, accounts, collaboration, or sync. The path to optional sync has been de-risked and
  documented ([ADR 0001](docs/decisions/0001-sync-architecture.md), [WB-201](tickets/WB-201-sync-spike.md)),
  but nothing is wired in — local-only remains the default.
- List rendering is virtualized and benchmarked to 50,000 tasks; filtering/sorting still run in memory
  ([WB-403](tickets/WB-403-virtualization-scale.md), [docs/performance.md](docs/performance.md)).
- Attachments live only in this browser's IndexedDB and are excluded from every export (plain or
  encrypted), so they do not survive a device change.
- Encrypted backups use PBKDF2 + AES-GCM and have no passphrase recovery; a lost passphrase makes the
  file unrecoverable ([docs/pwa.md](docs/pwa.md)).
- Reminder notifications fire only while Workboard is open. There is no Web Push or background sync,
  because that would require a backend.
