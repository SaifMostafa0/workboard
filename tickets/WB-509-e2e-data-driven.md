---
id: WB-509
title: Make E2E specs data-driven instead of coupled to seed fixtures
status: done
priority: medium
project: eng-ai-dx
assignee: agent:opencode
tags: area:ci, type:test
created: 2026-10-26
updated: 2026-10-26
source: handoff
---

## Summary

Several Playwright specs asserted on specific seeded ticket IDs, titles, and project names
(`WB-403`, `WB-101`, `WB-202`, `WB-104`, `WB-508`, `Roadmap T1`). The E2E seed is generated from
this repository's backlog, so completing a ticket silently changed the tests that referenced it.

## Acceptance criteria

- [x] E2E specs no longer reference specific ticket IDs, titles, or seeded project names.
- [x] Task cards expose stable data attributes for test assertions.
- [x] Filter, search, saved-view, and export tests assert behavior from rendered data and URL state.
- [x] Tests wait for filtering to settle instead of counting stale cards.
- [x] Full CI stays green.

## Notes

- The attributes are non-visual and stable across copy changes: id, project id, status, priority,
  due date, and tags.
- The tag-filter test chooses a tag that applies to only part of the rendered task set, so it
  proves the filter excludes tasks without naming a fixture.
- Export tests capture a rendered task/project and assert the downloaded file contains it.

## Updates

### 2026-10-26 — done

- Added `data-task-{id,project-id,status,priority,due-date,tags}` to `TaskCard`.
- Rewrote `e2e/filters.spec.ts`, `e2e/saved-views.spec.ts`, and `e2e/exports.spec.ts` to derive
  their assertions from rendered cards and URL state.
- Replaced count snapshots with `expect.poll` checks that wait until every visible card matches the
  active filter, removing the stale-list race that surfaced in the first full CI run.
- Verified with repeated filter/saved-view runs and the full CI gate.
