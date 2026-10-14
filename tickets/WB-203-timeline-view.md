---
id: WB-203
title: Add a timeline / roadmap view
status: todo
priority: medium
project: t2-differentiators
assignee: unassigned
tags: tier:2, area:ui, area:ux, type:feature
created: 2026-10-14
updated: 2026-10-14
source: competitor-analysis
---

## Summary

A horizontal timeline showing tasks or epics across time gives planning context that the board
and list lack. This is a common reason teams move to Asana or Monday.com.

## Acceptance criteria

- [ ] A `/timeline` route renders project rows and task bars positioned by due date (and a start date if added later).
- [ ] Bars scale across day/week/month zoom levels with a "today" marker.
- [ ] Overdue and completed tasks are visually distinct; hovering/focusing a bar summarises the task.
- [ ] Project and status filters apply, driven by the URL like other views.
- [ ] Keyboard navigable; bars are focusable and announce their dates.
- [ ] Handles empty projects and tasks without dates gracefully.
- [ ] Component tests for the date-to-pixel scaling maths.

## Notes

- Depends conceptually on `WB-102` (parent/child) if timelines should roll up epics; can ship task-only first.
- Keep the layout CSS-based; avoid a heavy Gantt library to protect the bundle budget.
