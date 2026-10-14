---
id: WB-401
title: Add epics / milestones above tasks
status: in_progress
priority: high
project: product-gaps
assignee: agent:opencode
tags: area:domain, area:ui, type:feature, gap:hierarchy
created: 2026-10-14
updated: 2026-10-15
source: competitor-analysis
---

## Summary

Workboard's model is Project → Task. Jira and Linear add a planning tier (epic / milestone) above
tasks, which is essential for grouping work and rolling up progress. This is the largest
product-model gap versus the enterprise tools.

## Acceptance criteria

- [x] Domain (`src/domain/epic.ts`) with `Epic` / `EpicInput`; `Task` gained optional `epicId`; `validation.ts` adds schemas + import/export/relationships; `epicRepository` with CRUD + detach-on-delete via `useDeleteEpic`; hooks `useEpics`/`useCreateEpic`/`useUpdateEpic`/`useDeleteEpic`; `migrations` exports/imports/clears `epics`.
- [ ] Epics appear on the project detail view with rolled-up progress (done / total, % complete).
- [ ] Tasks can be assigned to an epic in the task form; unassigned tasks remain valid.
- [ ] An epic filter is available on the Tasks page and in saved views.
- [ ] Deleting an epic detaches tasks rather than deleting them (documented behaviour).
- [ ] Schema change is additive and backward compatible; migrations tested.
- [ ] Domain and component tests cover roll-ups and detach-on-delete.

## Notes

- Sequence with `WB-102` (sub-tasks) to avoid two competing hierarchy mechanisms.
- Decide and document the relationship: is an epic also a task type, or a separate entity? Recommendation: separate entity for clarity.
