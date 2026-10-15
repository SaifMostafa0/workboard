---
id: WB-401
title: Add epics / milestones above tasks
status: done
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
- [x] Epics appear on the project detail view with rolled-up progress (done / total, % complete).
- [x] Tasks can be assigned to an epic in the task form; unassigned tasks remain valid.
- [x] An epic filter is available on the Tasks page and in saved views.
- [x] Deleting an epic detaches tasks rather than deleting them (documented behaviour).
- [x] Schema change is additive and backward compatible; migrations tested.
- [x] Domain and component tests cover roll-ups and detach-on-delete.

## Notes

- Sequence with `WB-102` (sub-tasks) to avoid two competing hierarchy mechanisms.
- Decide and document the relationship: is an epic also a task type, or a separate entity? Recommendation: separate entity for clarity.

## Updates

- 2026-10-15 — Implemented. **Decision: an epic is a separate, project-scoped entity** (not a task type), so the hierarchy is Project → Epic → Task while tasks keep working without an epic. `src/domain/epic.ts` defines `Epic` / `EpicInput` / `EpicUpdate` and the pure `computeEpicProgress(epicId, tasks)` roll-up; `Task` / `TaskInput` gained an optional `epicId`.
- Validation: `epicSchema` / `epicInputSchema` / `epicUpdateSchema`, plus `validateTaskEpicReference` and import-relationship rules (orphan epics, foreign-epic references, duplicate epic ids). `LocalEpicRepository` validates input like the task repository and its `list(projectId)` now filters on the epic's `projectId` (the previous `epic.id.startsWith(projectId)` check never matched).
- UI: the project detail view gains an **Epics** panel with done/total % roll-up, an inline **New Epic** button, and per-epic edit/delete; `EpicFormDialog` (new `src/features/projects/components/`) creates and edits epics. The task form gains an "Epic (optional)" selector (unassigned remains valid). The Tasks page gains an epic filter that round-trips through the URL, and saved views persist it (`epic` added to `savedViewFiltersSchema`).
- Delete semantics: `useDeleteEpic` soft-deletes the epic (trash/restore) and **detaches** (never deletes) its tasks; the confirmation states this.
- Tests: domain `epic.test.ts` (roll-ups, epic shape), repository `epicRepository.test.ts` (create/list/listByProject/update/restore/purge + project-scoping regression), validation import-relationship cases (orphan/cross-project/duplicate), migrations epic round-trip + replace-clears + `clearAllData`, `TaskFormDialog.test.tsx` (assign / leave unassigned), and `useData.test.ts` (`useDeleteEpic` detach-on-delete). Schema stays additive: `epics` defaults to `[]` for legacy payloads, so no migration is required. Gates: lint, typecheck, 361 unit tests, build, size all green.
