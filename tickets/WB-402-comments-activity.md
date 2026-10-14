---
id: WB-402
title: Add comments and an activity feed
status: todo
priority: medium
project: product-gaps
assignee: unassigned
tags: area:domain, area:ui, type:feature, gap:collaboration
created: 2026-10-14
updated: 2026-10-14
source: competitor-analysis
---

## Summary

Every comparable tool lets you annotate work and see what changed. Workboard has neither
comments nor an audit trail. Even single-user, a per-task activity log improves recall and
forms the foundation for future collaboration.

## Acceptance criteria

- [ ] A task detail view shows a dated comment thread and a change history (status, priority, assignee, due date).
- [ ] Comments and activity entries are persisted with the task or in a related store.
- [ ] Changes made through the app (and via import) produce activity entries.
- [ ] The feed is accessible: ordered list semantics, timestamps in readable form.
- [ ] Tests cover activity generation on update and rendering of an empty thread.

## Notes

- Design the record shape so it can later carry an author id when accounts arrive (`WB-201` sync, future auth).
- Keep the activity log out of the compact JSON export unless `WB-404` decides otherwise.
