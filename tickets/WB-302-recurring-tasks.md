---
id: WB-302
title: Support recurring tasks
status: todo
priority: low
project: t3-platform
assignee: unassigned
tags: tier:3, area:domain, type:feature
created: 2026-10-14
updated: 2026-10-14
source: readme-gaps
---

## Summary

Tasks that repeat (daily, weekly, monthly, custom interval) are unsupported. They are common
for maintenance and routine work.

## Acceptance criteria

- [ ] `Task` gains an optional recurrence rule (frequency + interval + optional until date).
- [ ] Completing a recurring task schedules the next occurrence rather than ending the series.
- [ ] Recurrence is validated in the domain and rendered in the task form and list.
- [ ] The next occurrence is computed by a pure, timezone-safe domain function.
- [ ] A series can be stopped; past occurrences are retained as history.
- [ ] Tests cover interval maths, DST/timezone edges, and completion behaviour.

## Notes

- Keep the rule shape simple (RFC 5545 RRULE is likely overkill); document the subset supported.
- All dates in the app are calendar dates (`YYYY-MM-DD`); preserve that convention.
