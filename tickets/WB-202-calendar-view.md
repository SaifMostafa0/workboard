---
id: WB-202
title: Add a calendar view
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

Due dates exist but can only be seen in a list. A calendar (month/week) view is table stakes in
Trello Premium and Asana and makes due dates actionable.

## Acceptance criteria

- [x] A `/calendar` route renders tasks by `dueDate` in a month grid, with a week view.
- [x] Tasks are grouped and colour-coded by project; overdue tasks are visually distinct.
- [x] Clicking a day shows that day's tasks; clicking a task opens the task detail.
- [x] View state (range, project filter) is stored in the URL for shareable links.
- [x] Fully keyboard navigable and screen-reader friendly (grid semantics, roving tabindex or equivalent).
- [x] Empty and no-due-date states are handled explicitly.
- [x] Component tests for date bucketing; one E2E journey.

## Notes

- Reuse the existing date utilities and design tokens; do not add a calendar dependency unless the a11y story is verified.

## Updates

### 2026-10-26 — Implemented

- Added a pure `src/domain/calendar.ts` model: stable six-week month grids and seven-day
  weeks starting Sunday, due-date bucketing, overdue detection, task sorting, undated-task
  collection, and project grouping.
- Added `/calendar` with URL-backed `view`, `date`, `day`, and `project` state. Defaults are
  canonicalised to a shareable `?view=month&date=YYYY-MM-DD` URL.
- Added an ARIA grid with roving tabindex, arrow/Home/End/PageUp/PageDown navigation, explicit
  day labels (task and overdue counts), and a selected-day panel. Tasks open the existing edit
  dialog; project colours come from `PROJECT_COLOR_HEX`.
- Added explicit empty, no-due-date, and filtered-empty states, plus a project legend and filter.
- Added navigation via the sidebar, command palette, and `g c` shortcut.
- Tests: 10 pure date-bucketing/grouping tests in `src/domain/__tests__/calendar.test.ts`; a
  Playwright journey in `e2e/calendar.spec.ts`; Calendar added to the axe page sweep.
- Docs: README feature/future-work lists, `STATUS.md`, `docs/architecture.md`,
  `docs/accessibility.md`, `docs/testing-strategy.md`, and `COMPETITOR_ANALYSIS.md` updated.
