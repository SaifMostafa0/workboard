---
id: WB-103
title: Add task dependencies (blocked by / blocks)
status: todo
priority: medium
project: t1-quick-wins
assignee: unassigned
tags: tier:1, area:domain, area:ui, type:feature
created: 2026-10-14
updated: 2026-10-14
source: readme-gaps
---

## Summary

There is no way to express that one task blocks another. Dependencies are a core planning
primitive in Jira and Linear and let the app flag work that cannot start yet.

## Acceptance criteria

- [ ] `Task` gains `blockedBy: string[]` (task ids), validated against existing tasks.
- [ ] A task shows a "Blocked" indicator when any blocking task is not `done`.
- [ ] The Task form lets a user add/remove blockers with keyboard support.
- [ ] Cycles are prevented (A blocks B blocks A is rejected with a clear error).
- [ ] Blocked tasks are visually distinct in list and Kanban views.
- [ ] A dependency filter is available on the Tasks page (e.g. `blocked=true`).
- [ ] Domain and component tests cover cycle rejection and blocked-state derivation.

## Notes

- Derive blocked state in a pure domain function; do not store a redundant "isBlocked" flag.
- This is additive to `WB-102`; both touch the task domain model, so sequence them to avoid churn.
