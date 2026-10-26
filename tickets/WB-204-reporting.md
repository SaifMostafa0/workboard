---
id: WB-204
title: Add basic reporting — cycle time, throughput and overdue trend
status: done
priority: medium
project: t2-differentiators
assignee: agent:opencode
tags: tier:2, area:ui, area:domain, type:feature
created: 2026-10-14
updated: 2026-10-26
source: competitor-analysis
---

## Summary

The dashboard shows point-in-time counts. Add simple, trend-based reporting so the app is
useful for reflection, not just task entry.

## Acceptance criteria

- [x] Reports show throughput (tasks completed per week) over a selectable range.
- [x] Cycle time (created → completed) is reported per project over the range.
- [x] An overdue trend chart shows counted-overdue tasks over time.
- [x] All metrics are computed by pure domain functions from stored timestamps (`createdAt`, `completedAt`, `dueDate`).
- [x] Charts are accessible: values available as text/table, not colour alone, and keyboard reachable.
- [x] Unit tests cover the aggregation maths with fixed fixtures.
- [x] No new runtime dependency if a small SVG implementation suffices within the bundle budget.

## Notes

- Prefer dependency-free SVG charts; the app targets a ≤200 KB gzip JS budget.
- Be explicit that metrics are derived locally from user data and never uploaded.

## Updates

### 2026-10-26 — Implemented

- Added `/reports` with a URL-backed `weeks=4|8|12` range (canonical default `8`) and a locally
  computed privacy note. The page includes throughput, per-project cycle time, and an overdue trend.
- Added `src/domain/reporting.ts`: weekly Sunday–Saturday buckets, a partial current week, average
  elapsed cycle days per project (including an "No project" row for orphaned tasks), and historical
  overdue snapshots. The current time is injectable for deterministic tests.
- Charts are dependency-free CSS bars. Each week is a keyboard-focusable button with an explicit
  accessible name and selected-week status; all values are repeated in semantic tables. Overdue is
  labelled in text and not encoded by colour alone.
- Added Reports to the sidebar, command palette, `g i` shortcut/help, and the axe page sweep.
- Tests: 9 pure aggregation tests in `src/domain/__tests__/reporting.test.ts` cover range boundaries,
  weekly counts, historical overdue states, cycle averages, orphaned projects, invalid timestamps,
  and the 4/8/12-week options. Playwright covers data-driven through/delta assertions, range-table
  counts, chart keyboard selection, a clock-driven overdue transition, and the `g i` shortcut.
- Docs updated: README, status, competitor analysis, architecture, testing strategy, accessibility,
  project spec, and performance route budget.
- Final gates: `npm run ci` green — 523 unit/component tests, 186 E2E tests (185 passed, 1
  desktop-only skip), coverage 87.73% statements / 80.71% branches; `npm run size` 184.96 kB gzip
  JS / 15.32 kB gzip CSS, both within budget.
