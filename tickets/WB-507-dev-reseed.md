---
id: WB-507
title: Dev-only reseed so the Workboard backlog always comes back in development
status: done
priority: low
project: eng-ai-dx
assignee: agent:opencode
tags: area:storage, type:chore, area:docs
created: 2026-10-16
updated: 2026-10-16
source: handoff
---

## Summary

Since WB-506 the app seeds Workboard's own backlog on first launch — but only once per browser
profile (`workboard:meta:seeded`). Developers who already had that flag set from the old demo data,
or who delete their data while developing, end up with a permanently empty app and no obvious way
back short of clearing site data or hand-importing `workboard-import.json`.

Make development forgiving: in dev only, if the app has no projects, (re)import the backlog on
startup even when the seeded flag is already set. Production semantics are unchanged — it seeds
nothing and never re-seeds after a wipe.

## Acceptance criteria

- [x] `initializeApp` re-seeds in development whenever there are zero projects, regardless of the
      seeded flag.
- [x] Production builds still seed nothing and never re-seed after `clearAllData`.
- [x] `loadDevSeed()` remains the single gate (`import.meta.env.DEV`) so no seed reaches `dist`.
- [x] Unit tests cover both paths (dev re-seeds; production does not).
- [x] Docs updated; gates green (format, lint, typecheck, tickets, unit tests, build, size, E2E).

## Notes

- Follow-up to [WB-506](WB-506-dev-seed-workboard-backlog.md).
- Not a "Reset to Demo" revival: nothing in the UI changes, and production keeps the one-way
  behaviour.

## Updates

- 2026-10-16 — `initializeApp` now checks the seed before the `SEEDED_KEY` early-return: when
  `loadDevSeed()` yields the backlog (development) and the app has no projects, it re-imports it.
  A non-empty app is never touched, and because `loadDevSeed()` is `null` in production the
  production path is byte-for-byte the old behaviour (seed nothing, never re-seed).
- 2026-10-16 — Replaced the "never re-seeds once cleared" unit test with two: dev re-seeds an
  emptied app; production seeds nothing and stays empty across repeated `initializeApp`.
  Documented in `README` and `docs/architecture.md`. Gates: 363 unit tests, size/E2E unchanged.
