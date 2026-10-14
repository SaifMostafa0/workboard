---
id: WB-102
title: Add sub-tasks (parent/child tasks)
status: done
priority: high
project: t1-quick-wins
assignee: agent:opencode
tags: tier:1, area:domain, area:ui, type:feature
created: 2026-10-14
updated: 2026-10-15
source: readme-gaps
---

## Summary

Workboard has a flat task model, so there is no way to break a task into smaller steps.
Sub-tasks are the single most requested capability on a "serious" task tool and the clearest
gap versus Jira, Linear and Asana. This adds a self-referential parent/child relationship.

## Acceptance criteria

- [x] `Task` gains an optional `parentId?: string` (a task id) with validation that the parent exists and is not itself a child (max depth of one level).
- [x] A task with children displays a progress indicator (done / total) in list and Kanban views.
- [x] Tasks with a `parentId` are hidden from the top-level board/list by default, with a toggle to show them.
- [x] Creating, editing and deleting a parent updates its children safely (deleting a parent either blocks with a warning or cascades to trash — decide and document).
- [x] IndexedDB records remain backward compatible (missing `parentId` is valid).
- [x] Domain, repository, and component tests cover nesting, depth limits and cascade behaviour.

## Notes

- Keep the storage schema additive; no migration should be required because `parentId` is optional.
- Reuse the existing trash/soft-delete semantics for cascades rather than hard deletes.

## Updates

- 2026-10-15 — Implemented. **Decision: deleting a parent cascades to trash its active sub-tasks** (and restoring the parent restores them), so the hierarchy is never left dangling; the delete confirmation mentions the sub-task count. `Task` / `TaskInput` gained `parentId?: string`; `src/domain/task.ts` now exports `MAX_SUBTASK_DEPTH` (1), `isSubtask`, `getSubtaskProgress` / `hasSubtaskProgress`, and the pure `validateParentAssignment` (`parent_is_self`, `parent_not_found`, `parent_is_subtask`, `task_has_children`). `taskInputSchema` / `taskSchema` accept an optional UUID `parentId`. `taskRepository` validates and inherits the parent's `projectId` on `create`, re-validates on `update`, exposes `listChildren(parentId)`, and cascades soft-delete / restore through active children.
- UI: `TaskCard` renders a "Sub-task" badge and a `done/total` progress badge, plus an "Add sub-task" action on top-level cards; `TaskFormDialog` gains optional `parentId` / `parentTitle` and a "Create Sub-task" mode (project selector hidden — the project is inherited). Both the Tasks page and the project board/list add a "Show sub-tasks" toggle (off by default), thread the progress map through, and open the sub-task create dialog with the parent preselected.
- Tests: domain `task.test.ts` (+11), repository `taskRepository.test.ts` (+10: inheritance, depth limit, missing/self parent, `listChildren`, cascade delete + restore, re-parenting), component `TaskCard.test.tsx` (+4), and a new `e2e/subtasks.spec.ts` (create + hide/toggle, progress updates on completion, cascade delete → trash). Existing records without `parentId` remain valid, so no migration is needed. Gates: lint, typecheck, 328 unit tests, build, E2E all green.
