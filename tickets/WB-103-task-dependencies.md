---
id: WB-103
title: Add task dependencies (blocked by / blocks)
status: done
priority: medium
project: t1-quick-wins
assignee: agent:opencode
tags: tier:1, area:domain, area:ui, type:feature
created: 2026-10-14
updated: 2026-10-16
source: readme-gaps
---

## Summary

There is no way to express that one task blocks another. Dependencies are a core planning
primitive in Jira and Linear and let the app flag work that cannot start yet.

## Acceptance criteria

- [x] `Task` gains `blockedBy: string[]` (task ids), validated against existing tasks.
- [x] A task shows a "Blocked" indicator when any blocking task is not `done`.
- [x] The Task form lets a user add/remove blockers with keyboard support.
- [x] Cycles are prevented (A blocks B blocks A is rejected with a clear error).
- [x] Blocked tasks are visually distinct in list and Kanban views.
- [x] A dependency filter is available on the Tasks page (e.g. `blocked=true`).
- [x] Domain and component tests cover cycle rejection and blocked-state derivation.

## Notes

- Derive blocked state in a pure domain function; do not store a redundant "isBlocked" flag.
- This is additive to `WB-102`; both touch the task domain model, so sequence them to avoid churn.

## Updates

**2026-10-16 — Implemented.**

- **Domain**: added `Task.blockedBy?: string[]` and a new pure module `src/domain/dependency.ts`
  (`isTaskBlocked`, `getBlockingTasks`, `collectBlockedTaskIds`, `wouldCreateDependencyCycle`,
  `validateTaskBlockers`, `toTaskOptions`, `DEPENDENCY_MESSAGES`). Blocked state is derived from the
  blockers' statuses and never stored. Missing/trashed blockers are ignored so a delete can't wedge a
  task; a finished task is never blocked. `"blocks"` is the derived back-link of `blockedBy`.
- **Query**: `TaskQuery.blocked?: boolean` narrows `filterTasks`; `collectTaskSummary` now also
  returns `blockedTaskIds` and the lightweight blocker-picker `options` in its existing single pass.
- **Persistence**: `taskRepository.create`/`update` validate blockers (must reference an active task,
  no self-reference, no cycle) and return a `VALIDATION_ERROR` (`dependency_*` codes) with a readable
  message; imports stay tolerant via the optional schema field.
- **UI**: `BlockerPicker` (native `<select>` + removable chips, fully keyboard reachable) is wired into
  both task-dialog variants; candidates omit the task itself, already-chosen tasks, and any task that
  would close a loop. `TaskCard` shows a "Blocked" badge in the list and Kanban. The Tasks page gains a
  dependency filter (`blocked=true|false`) with URL + saved-view round-tripping.
- **Tests**: new `dependency.test.ts`; blocked-filter and summary cases in `taskQuery.test.ts`;
  repository cycle/validation cases; validation cases; `TaskCard` badge and `TaskFormDialog`
  add/remove/cycle-exclusion component tests. 477 unit tests (34 files) pass; coverage 85.8% / 79.1%.
- **Docs**: `docs/architecture.md` notes dependency derivation and validation; `STATUS.md` updated.
