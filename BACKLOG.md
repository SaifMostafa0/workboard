# Workboard — Backlog

> **Generated file — do not edit.** Run `npm run tickets:build` after changing `tickets/WB-*.md`.
> The ticket markdown files are the source of truth; see [docs/project-management.md](docs/project-management.md).

**12 open / 16 done / 28 total** · last update 2026-10-26

## Progress by project

| Project | Open | Done | Total |
| --- | ---: | ---: | ---: |
| WB — Roadmap T1 · Quick Wins | 0 | 4 | 4 |
| WB — Roadmap T2 · Differentiators | 3 | 1 | 4 |
| WB — Roadmap T3 · Platform | 5 | 0 | 5 |
| WB — Product Gaps | 1 | 3 | 4 |
| WB — Engineering & AI-DX | 1 | 7 | 8 |
| WB — Quality & Accessibility | 2 | 1 | 3 |

## WB — Roadmap T1 · Quick Wins

Tier 1 roadmap: cheap, high-signal wins that close the most visible gaps.

| ID | Title | Status | Priority | Assignee | Tags | Updated |
| --- | --- | --- | --- | --- | --- | --- |
| WB-101 | Finish Saved Views — apply saved filters on the Tasks page | Done | high | agent:opencode | tier:1, area:ux, area:state, type:feature | 2026-10-14 |
| WB-102 | Add sub-tasks (parent/child tasks) | Done | high | agent:opencode | tier:1, area:domain, area:ui, type:feature | 2026-10-15 |
| WB-103 | Add task dependencies (blocked by / blocks) | Done | medium | agent:opencode | tier:1, area:domain, area:ui, type:feature | 2026-10-16 |
| WB-104 | Add CSV and Markdown export plus a printable board | Done | medium | agent:opencode | tier:1, area:storage, area:ux, type:feature | 2026-10-26 |

## WB — Roadmap T2 · Differentiators

Tier 2 roadmap: features that turn Workboard's gaps into differentiators.

| ID | Title | Status | Priority | Assignee | Tags | Updated |
| --- | --- | --- | --- | --- | --- | --- |
| WB-201 | Spike — optional self-hostable sync behind the repository interface | Done | high | agent:opencode | tier:2, area:sync, area:storage, type:spike | 2026-10-16 |
| WB-202 | Add a calendar view | To Do | medium | unassigned | tier:2, area:ui, area:ux, type:feature | 2026-10-14 |
| WB-203 | Add a timeline / roadmap view | To Do | medium | unassigned | tier:2, area:ui, area:ux, type:feature | 2026-10-14 |
| WB-204 | Add basic reporting — cycle time, throughput and overdue trend | To Do | medium | unassigned | tier:2, area:ui, area:domain, type:feature | 2026-10-14 |

## WB — Roadmap T3 · Platform

Tier 3 roadmap: platform and ecosystem work.

| ID | Title | Status | Priority | Assignee | Tags | Updated |
| --- | --- | --- | --- | --- | --- | --- |
| WB-301 | Add file attachments stored in IndexedDB | To Do | medium | unassigned | tier:3, area:storage, area:ui, type:feature | 2026-10-14 |
| WB-305 | Ship a PWA with install and encrypted local backup | To Do | medium | unassigned | tier:3, area:ux, area:storage, type:feature | 2026-10-14 |
| WB-302 | Support recurring tasks | To Do | low | unassigned | tier:3, area:domain, type:feature | 2026-10-14 |
| WB-303 | Add due-date reminders and in-app notifications | To Do | low | unassigned | tier:3, area:ux, area:storage, type:feature | 2026-10-14 |
| WB-304 | Design a public API and webhooks for automation | To Do | low | unassigned | tier:3, area:sync, area:docs, type:spike | 2026-10-14 |

## WB — Product Gaps

Capability gaps versus Jira, Trello and Linear, plus gaps found in the codebase.

| ID | Title | Status | Priority | Assignee | Tags | Updated |
| --- | --- | --- | --- | --- | --- | --- |
| WB-401 | Add epics / milestones above tasks | Done | high | agent:opencode | area:domain, area:ui, type:feature, gap:hierarchy | 2026-10-15 |
| WB-403 | Virtualize long lists and raise the ~10k-task scale ceiling | Done | high | agent:opencode | area:perf, area:ui, type:feature, gap:scale | 2026-10-16 |
| WB-404 | Include labels and saved views in export/import | Done | high | agent:opencode | area:storage, area:docs, type:bug, gap:data | 2026-10-14 |
| WB-402 | Add comments and an activity feed | To Do | medium | unassigned | area:domain, area:ui, type:feature, gap:collaboration | 2026-10-14 |

## WB — Engineering & AI-DX

Dogfooding, documentation-as-code and agent-friendliness of the project itself.

| ID | Title | Status | Priority | Assignee | Tags | Updated |
| --- | --- | --- | --- | --- | --- | --- |
| WB-502 | Establish a ticket system with a machine-readable backlog | Done | high | agent:opencode | area:docs, area:ci, type:docs | 2026-10-14 |
| WB-503 | Add AGENTS.md and a documentation-as-code workflow | Done | high | agent:opencode | area:docs, type:docs, ai:agent-friendly | 2026-10-14 |
| WB-501 | Publish a competitor analysis (Jira, Trello, Linear) | Done | medium | agent:opencode | area:docs, type:docs, source:competitor-analysis | 2026-10-14 |
| WB-504 | Enforce ticket/backlog sync in CI | Done | medium | agent:opencode | area:ci, type:chore, ai:agent-friendly | 2026-10-14 |
| WB-505 | Add a Workboard-to-ticket sync script | Done | medium | agent:opencode | area:docs, area:storage, type:feature, ai:agent-friendly | 2026-10-14 |
| WB-506 | Dev-only seeding of the Workboard backlog, no placeholder demo data | Done | medium | agent:opencode | type:chore, area:storage, area:docs, area:ci | 2026-10-15 |
| WB-508 | Un-skip and fix the mobile Kanban drag E2E tests | To Do | medium | unassigned | area:ci, area:ux, type:test | 2026-10-14 |
| WB-507 | Dev-only reseed so the Workboard backlog always comes back in development | Done | low | agent:opencode | area:storage, type:chore, area:docs | 2026-10-16 |

## WB — Quality & Accessibility

Accessibility, performance budgets, and test-depth improvements.

| ID | Title | Status | Priority | Assignee | Tags | Updated |
| --- | --- | --- | --- | --- | --- | --- |
| WB-601 | Improve Select and DatePicker keyboard and ARIA support | Done | high | agent:opencode | area:a11y, area:ui, type:bug, ai:agent-friendly | 2026-10-15 |
| WB-602 | Wire a Lighthouse CI performance budget gate | To Do | medium | unassigned | area:perf, area:ci, type:chore | 2026-10-14 |
| WB-603 | Raise branch coverage and cover labels and saved views | To Do | medium | unassigned | area:ci, type:test, area:domain | 2026-10-14 |

---

Manage day-to-day in the Workboard app: import [`project-management/workboard-import.json`](project-management/workboard-import.json) (Settings → Import), then sync changes back with `npm run tickets:sync <export.json>`.
