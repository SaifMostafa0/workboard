---
id: WB-203
title: Add a timeline / roadmap view
status: done
priority: medium
project: t2-differentiators
assignee: agent:opencode
tags: tier:2, area:ui, area:ux, type:feature
created: 2026-10-14
updated: 2026-10-26
source: competitor-analysis
---

## Summary

A horizontal timeline showing tasks or epics across time gives planning context that the board
and list lack. This is a common reason teams move to Asana or Monday.com.

## Acceptance criteria

- [x] A `/timeline` route renders project rows and task bars positioned by due date (and a start date if added later).
- [x] Bars scale across day/week/month zoom levels with a "today" marker.
- [x] Overdue and completed tasks are visually distinct; hovering/focusing a bar summarises the task.
- [x] Project and status filters apply, driven by the URL like other views.
- [x] Keyboard navigable; bars are focusable and announce their dates.
- [x] Handles empty projects and tasks without dates gracefully.
- [x] Component tests for the date-to-pixel scaling maths.

## Notes

- Depends conceptually on `WB-102` (parent/child) if timelines should roll up epics; can ship task-only first.
- Keep the layout CSS-based; avoid a heavy Gantt library to protect the bundle budget.

## Updates

### 2026-10-26 — Implemented

- Added a pure `src/domain/timeline.ts` model: 21-day, 12-week, and 12-month windows,
  date-to-percentage placement, tick generation, half-window navigation, and lane packing for
  overlapping task bars.
- Added `/timeline` with project rows, date-scaled bars, a today marker, day/week/month zoom,
  previous/next window navigation, and URL-backed `zoom`, `date`, `project`, and `status` state.
  Defaults canonicalise to a shareable `?zoom=week&date=YYYY-MM-DD` URL.
- Bars are native buttons with full accessible names (title, due date, status, priority, overdue,
  completed) and open the existing edit dialog. Overdue and completed tasks have distinct styles;
  hovering/focusing shows a summary.
- Empty project rows stay in the roadmap; tasks without due dates are listed separately, and dated
  tasks outside the current window are counted with guidance to navigate.
- Added sidebar and command-palette navigation plus the `g m` shortcut.
- Tests: 11 pure timeline-range/placement/row-model tests in
  `src/domain/__tests__/timeline.test.ts`; a Playwright journey in `e2e/timeline.spec.ts` covering
  bar rendering, zoom, filters, range navigation, keyboard opening, and undated tasks; Timeline
  added to the axe page sweep.
- Docs: README, `STATUS.md`, `docs/architecture.md`, `docs/accessibility.md`,
  `docs/testing-strategy.md`, and `COMPETITOR_ANALYSIS.md` updated.
