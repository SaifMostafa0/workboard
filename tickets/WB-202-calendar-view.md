---
id: WB-202
title: Add a calendar view
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

Due dates exist but can only be seen in a list. A calendar (month/week) view is table stakes in
Trello Premium and Asana and makes due dates actionable.

## Acceptance criteria

- [ ] A `/calendar` route renders tasks by `dueDate` in a month grid, with a week view.
- [ ] Tasks are grouped and colour-coded by project; overdue tasks are visually distinct.
- [ ] Clicking a day shows that day's tasks; clicking a task opens the task detail.
- [ ] View state (range, project filter) is stored in the URL for shareable links.
- [ ] Fully keyboard navigable and screen-reader friendly (grid semantics, roving tabindex or equivalent).
- [ ] Empty and no-due-date states are handled explicitly.
- [ ] Component tests for date bucketing; one E2E journey.

## Notes

- Reuse the existing date utilities and design tokens; do not add a calendar dependency unless the a11y story is verified.
