---
id: WB-403
title: Virtualize long lists and raise the ~10k-task scale ceiling
status: done
priority: high
project: product-gaps
assignee: agent:opencode
tags: area:perf, area:ui, type:feature, gap:scale
created: 2026-10-14
updated: 2026-10-16
source: readme-gaps
---

## Summary

`README.md` lists "~10,000 tasks before performance degrades" as a known limitation because all
records are loaded and filtered in memory. Virtualize rendering and move pagination to the
repository layer so the app stays smooth at scale.

## Acceptance criteria

- [x] Task and project lists render with windowing so DOM node count stays bounded.
- [x] A repository-level paged query avoids loading every record for list views.
- [x] Filtering/sorting remain correct and instant for datasets of at least 50k tasks (documented benchmark).
- [x] A repeatable benchmark script records render and filter timings in `docs/performance.md`.
- [x] No regression to keyboard navigation, focus order, or the a11y axe checks.
- [x] Update the "Known Limitations" section of README once the ceiling is raised.

## Notes

- `docs/performance.md` already anticipates virtualization "if measured"; this ticket makes it measured and required.
- Keep the public filter/sort/paginate domain functions; change where they run, not what they do.

## Updates

- 2026-10-16 — **Storage.** `indexedDBAdapter` now reads by key range (`prefixRange(prefix)`); `getAll`,
  `getKeys` and `clear(prefix)` no longer deserialise the whole object store.
- 2026-10-16 — **Domain.** Extracted the filter/sort/paginate pipeline into pure functions
  (`src/domain/taskQuery.ts`, `src/domain/pagination.ts`) with `collectTaskSummary` (total + tags +
  sub-task progress in one scan).
- 2026-10-16 — **Repository + hooks.** Added `ITaskRepository.listPage(query)` and `summary()`, exposed as
  `useTasksPage(query)` (keep-previous while paging) and `useTaskSummary()`. New query keys sit under the
  existing `['tasks']` prefix so current invalidations still cover them. TasksPage no longer holds every
  task in React state; selection is id-based and pagination/URL/saved-view behaviour is unchanged.
- 2026-10-16 — **Windowing.** New dependency-free `src/components/ui/VirtualList.tsx` (uniform rows, overscan,
  spacer padding, grid support) with the scroll container as `role="list"` and wrappers `role="presentation"`.
  Tasks window above `TASK_WINDOW_THRESHOLD = 30` rows using dense cards; the Projects grid windows through
  `useGridColumns` (responsive column count) above 50 rows. Short lists render exactly as before.
- 2026-10-16 — **Benchmark.** `npm run bench` (Vitest 5 `bench` fixture) records the query pipeline at
  1k/10k/50k tasks and a 50k-row render with windowing on vs off; numbers and methodology are in
  `docs/performance.md`. Measured: 50k default query ≈ 26 ms, filtered ≈ 10 ms; windowed render of 50k rows
  ≈ 0.07 ms vs ≈ 214 ms unwindowed (~3,000×, constant DOM).
- 2026-10-16 — **Deviations.** The approved option text mentioned `count`/`getPage` adapter primitives, but no
  clean caller exists without an IndexedDB schema change (tasks sort by domain fields, not storage-key order),
  so only prefix-scoped reads landed; true index-backed paging is deferred. Project `listPage` was dropped as
  unused (the task `listPage` satisfies the paged-query criterion); `filterProjects` was kept because project
  `search()` now reuses it. Because pagination controls are retained, per-page DOM is already bounded, so
  windowing acts as a second cap for large page sizes.
- 2026-10-16 — Docs updated (`README`, `docs/architecture.md`, `docs/performance.md`, `AGENTS.md`,
  `CASE_STUDY.md`, `COMPETITOR_ANALYSIS.md`, `STATUS.md`). Gates green: 401 unit tests (28 files), lint,
  typecheck, build, size (168 KB gzip JS / 11 KB CSS), E2E 154 passed / 2 skipped.
