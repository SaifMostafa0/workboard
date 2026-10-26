---
id: WB-603
title: Raise branch coverage and cover labels and saved views
status: done
priority: medium
project: quality-a11y
assignee: agent:opencode
tags: area:ci, type:test, area:domain
created: 2026-10-14
updated: 2026-10-26
source: handoff
---

## Summary

Coverage had fallen to 87.73% statements / 80.71% branches. The label and saved-view
repositories and their hooks were the least-covered areas (7/38 statements and 1/14 branches
each). Close those gaps, cover the remaining repository error paths, and raise the branch
threshold so the numbers stop being a soft target.

## Acceptance criteria

- [x] Label and saved-view repositories and hooks have unit/integration tests for success, empty, and error (`Result` err) paths.
- [x] Import/export tests cover the restored labels and saved views once `WB-404` lands.
- [x] Branch coverage threshold in `vitest.config.ts` is raised (target ≥85%) without weakening existing thresholds.
- [x] CI enforces the new threshold on `src/domain`, `src/infrastructure` and `src/lib`.
- [x] No tests rely on implementation details; behaviour is asserted through public APIs.

## Notes

- Use the existing fake storage adapter and failure injection rather than mocks.
- Coordinate with `WB-404`, which adds coverage-critical export/import paths.

## Updates

- 2026-10-26 — Added repository suites for labels and saved views covering list/get/create/update/delete, empty collections, not-found, and injected read/write/delete failures. Extended the hook suite with empty, success, and `Result` error paths for `useLabels`, `useSavedViews`, and their create/update/delete mutations. Filled the remaining failure branches in the project and epic repositories and the saved-view filter summaries. Raised the branch threshold from 75% to 85%; the existing CI coverage step now enforces it with no workflow change. `WB-404` already covered the label/saved-view export/import round trip, so no further import tests were needed. Coverage moved from 87.73% statements / 80.71% branches to 92.06% / 85.47% (583 tests). Gates: coverage, format, lint, typecheck, ticket checks, build, and E2E all green.
