---
id: WB-204
title: Add basic reporting — cycle time, throughput and overdue trend
status: todo
priority: medium
project: t2-differentiators
assignee: unassigned
tags: tier:2, area:ui, area:domain, type:feature
created: 2026-10-14
updated: 2026-10-14
source: competitor-analysis
---

## Summary

The dashboard shows point-in-time counts. Add simple, trend-based reporting so the app is
useful for reflection, not just task entry.

## Acceptance criteria

- [ ] Reports show throughput (tasks completed per week) over a selectable range.
- [ ] Cycle time (created → completed) is reported per project over the range.
- [ ] An overdue trend chart shows counted-overdue tasks over time.
- [ ] All metrics are computed by pure domain functions from stored timestamps (`createdAt`, `completedAt`, `dueDate`).
- [ ] Charts are accessible: values available as text/table, not colour alone, and keyboard reachable.
- [ ] Unit tests cover the aggregation maths with fixed fixtures.
- [ ] No new runtime dependency if a small SVG implementation suffices within the bundle budget.

## Notes

- Prefer dependency-free SVG charts; the app targets a ≤100 KB gzip JS budget.
- Be explicit that metrics are derived locally from user data and never uploaded.
