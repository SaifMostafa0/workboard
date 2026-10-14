---
id: WB-603
title: Raise branch coverage and cover labels and saved views
status: todo
priority: medium
project: quality-a11y
assignee: unassigned
tags: area:ci, type:test, area:domain
created: 2026-10-14
updated: 2026-10-14
source: handoff
---

## Summary

Coverage sits near ~89.6% statements / 78.5% branches. The newer label and saved-view
repositories and their hooks are the least-covered areas. Raise the branch threshold and close
those gaps so the numbers stop being a soft target.

## Acceptance criteria

- [ ] Label and saved-view repositories and hooks have unit/integration tests for success, empty, and error (`Result` err) paths.
- [ ] Import/export tests cover the restored labels and saved views once `WB-404` lands.
- [ ] Branch coverage threshold in `vitest.config.ts` is raised (target ≥85%) without weakening existing thresholds.
- [ ] CI enforces the new threshold on `src/domain`, `src/infrastructure` and `src/lib`.
- [ ] No tests rely on implementation details; behaviour is asserted through public APIs.

## Notes

- Use the existing fake storage adapter and failure injection rather than mocks.
- Coordinate with `WB-404`, which adds coverage-critical export/import paths.
