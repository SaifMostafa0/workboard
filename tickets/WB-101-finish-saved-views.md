---
id: WB-101
title: Finish Saved Views — apply saved filters on the Tasks page
status: done
priority: high
project: t1-quick-wins
assignee: agent:opencode
tags: tier:1, area:ux, area:state, type:feature
created: 2026-10-14
updated: 2026-10-14
source: competitor-analysis
---

## Summary

Saved Views currently have full CRUD (domain model, repository, hooks, page at `/saved-views`)
but a saved view's `filters` object is never applied anywhere. This is the one half-built
feature in the app and the highest-value quick win: it closes the gap without new domain work.

Applying a view should push its filters into the Tasks page URL query state so the existing
filter/sort/pagination machinery does the rest.

## Acceptance criteria

- [x] Selecting a saved view from `/saved-views` or the Tasks toolbar navigates to `/tasks` with the view's filters encoded in the URL.
- [x] Applying a view sets search, status, priority, project, due, tags, sort and order exactly as stored.
- [x] The active view name is visible on the Tasks page and can be cleared back to the default state.
- [x] A "Save current filters as view" action on the Tasks page creates a view from the live URL state.
- [x] Applying a view is keyboard accessible and announced to assistive tech.
- [x] Unit tests cover the URL <-> filters mapping; an E2E test covers apply + clear.

## Notes

- `SavedView.filters` already mirrors the Tasks URL param names (`q`, `status`, `priority`, `project`, `due`, `sort`, `order`, `tags`), so no schema migration is needed.
- Keep filter state URL-driven (see `CASE_STUDY.md` Decision 1); do not introduce a second source of truth.
- Tag filtering was wired into the Tasks filter bar as toggle chips (multi-select); a view's `tags` array round-trips through the `tags` URL param.

## Updates

- 2026-10-14 — Implemented. Added `src/lib/savedViewFilters.ts` (pure URL <-> filters mapping) with 15 unit tests; a `SavedViewsBar` on the Tasks page (apply + "Save view" dialog + active-view badge); a multi-select `TagFilter`; and an Apply action plus filter summaries on `/saved-views`. Applying a view is a pure state transition that the existing URL-sync effect persists, so reload/share still works. Added `e2e/saved-views.spec.ts` (save → clear → re-apply, and tag filtering). Gates: lint, typecheck, 295 unit tests, build, E2E all green.
