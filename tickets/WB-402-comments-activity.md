---
id: WB-402
title: Add comments and an activity feed
status: done
priority: medium
project: product-gaps
assignee: agent:opencode
tags: area:domain, area:ui, type:feature, gap:collaboration
created: 2026-10-14
updated: 2026-10-28
source: competitor-analysis
---

## Summary

Every comparable tool lets you annotate work and see what changed. Workboard has neither
comments nor an audit trail. Even single-user, a per-task activity log improves recall and
forms the foundation for future collaboration.

## Acceptance criteria

- [x] A task detail view shows a dated comment thread and a change history (status, priority, assignee, due date).
- [x] Comments and activity entries are persisted with the task or in a related store.
- [x] Changes made through the app (and via import) produce activity entries.
- [x] The feed is accessible: ordered list semantics, timestamps in readable form.
- [x] Tests cover activity generation on update and rendering of an empty thread.

## Updates

**2026-10-28 — done**

- `TaskDetailDialog` now has a comment composer and an ordered change-history list, with relative
  dates plus a machine-readable `<time dateTime>` value. Empty states are explicit and the feed is
  announced as a region.
- Activity lives in its own store (`workboard:activity:<taskId>:<id>`), validated with Zod and
  sorted by creation time. Purging a task clears its history.
- `taskRepository.create/update` diffs tracked fields (`status`, `priority`, `assignee`,
  `dueDate`, `title`, `recurrence`) into activity entries; completion of a recurring task records
  the scheduled next occurrence; attachments record add events; import records `task_imported`.
- Comments are trimmed, capped at 2000 characters, and reject empty input with a validation error.
- Tests: domain diff/description/validation, repository add/list/comment/clear/storage-failure,
  update-generated activity and import-safe entries, and component tests for the empty thread,
  ordered rendering, posting and recurrence controls. See
  [`docs/architecture.md`](../../docs/architecture.md) for the layering.

## Notes

- Design the record shape so it can later carry an author id when accounts arrive (`WB-201` sync, future auth).
- Keep the activity log out of the compact JSON export unless `WB-404` decides otherwise.
