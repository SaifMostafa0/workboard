---
id: WB-302
title: Support recurring tasks
status: done
priority: low
project: t3-platform
assignee: agent:opencode
tags: tier:3, area:domain, type:feature
created: 2026-10-14
updated: 2026-10-28
source: readme-gaps
---

## Summary

Tasks that repeat (daily, weekly, monthly, custom interval) are unsupported. They are common
for maintenance and routine work.

## Acceptance criteria

- [x] `Task` gains an optional recurrence rule (frequency + interval + optional until date).
- [x] Completing a recurring task schedules the next occurrence rather than ending the series.
- [x] Recurrence is validated in the domain and rendered in the task form and list.
- [x] The next occurrence is computed by a pure, timezone-safe domain function.
- [x] A series can be stopped; past occurrences are retained as history.
- [x] Tests cover interval maths, DST/timezone edges, and completion behaviour.

## Updates

**2026-10-28 — done**

- `Task.recurrence` supports `daily | weekly | monthly`, an interval of 1–99 and an optional
  inclusive `until` date — deliberately not full RFC 5545.
- `src/domain/recurrence.ts` computes the next date in UTC, clamps monthly rules to shorter months
  (Jan 31 → Feb 28/29) and returns `undefined` past `until`, so DST never shifts a calendar date.
- `taskRepository.update` validates the rule against the effective due date, keeps the completed
  occurrence, and creates the next `todo` occurrence with a fresh id. `until` expiry, clearing the
  rule, and repeated completion (no duplicates) are covered.
- The task form exposes frequency/interval/until; task cards and the detail dialog show the rule,
  and the detail dialog can stop the series.
- Tests: interval maths, month-end clamping, DST/year boundaries, invalid inputs, validation,
  scheduling on completion, series stop and no-duplicate behaviour.

## Notes

- Keep the rule shape simple (RFC 5545 RRULE is likely overkill); document the subset supported.
- All dates in the app are calendar dates (`YYYY-MM-DD`); preserve that convention.
