---
id: WB-506
title: Dev-only seeding of the Workboard backlog, no placeholder demo data
status: done
priority: medium
project: eng-ai-dx
assignee: agent:opencode
tags: type:chore, area:storage, area:docs, area:ci
created: 2026-10-15
updated: 2026-10-15
source: handoff
---

## Summary

`npm run dev` currently seeds three placeholder demo projects ("Website Redesign", "Mobile App
v2", "Q3 Marketing Campaign") and 11 fake tasks on first launch, and Settings offers a "Reset to
Demo" action that restores them. The placeholder data makes the app look like a generic demo
instead of the tool it actually is — and it ships its own dogfooding backlog already, generated
from `tickets/WB-*.md` into `project-management/workboard-import.json`.

Replace the demo seed with Workboard's own backlog (projects + tasks) and load it **only in
development**. Production builds start with an empty app — no placeholders anywhere.

## Acceptance criteria

- [x] `createDemoData` / `demoData.ts`, `seedDemoData` and `resetToDemoData` are removed.
- [x] First `npm run dev` on a fresh profile seeds the 6 Workboard projects + their tasks from
      the generated `project-management/workboard-import.json`, validated through
      `importDataSchema` (`validateImportData`) before writing.
- [x] Seeding stays behind a static `import.meta.env.DEV` guard with a dynamic `import()` so the
      seed JSON never enters the production bundle; production builds start empty.
- [x] The existing `SEEDED_KEY` semantics are preserved (never re-seed after the user clears
      data).
- [x] Settings: "Reset to Demo" card, confirm dialog and `useResetDemoData` hook are removed;
      "Delete all data" remains the only destructive action.
- [x] Playwright runs against the dev server (seeded, dogfooded) instead of a preview build;
      E2E expectations reference real Workboard titles/tags.
- [x] Docs updated (`README`, `AGENTS`, `architecture`, `testing-strategy`, competitor analysis).
- [x] Gates green: format, lint, typecheck, tickets, unit tests, build, size, E2E.

## Notes

- `project-management/workboard-import.json` is generated — never hand-edit; regenerate with
  `npm run tickets:build`.
- Free ticket id: WB-506 (WB-507 also free, WB-508 already taken).

## Updates

- 2026-10-15 — Deleted `demoData.ts` and the `seedDemoData`/`resetToDemoData` exports. Added
  `src/infrastructure/storage/devSeed.ts`: `loadDevSeed()` reads the generated
  `project-management/workboard-import.json` through a dynamic `import()` guarded by
  `import.meta.env.DEV` and validates it with `validateImportData` before anything is written.
  `initializeApp` now calls it in place of `seedDemoData` on fresh installs; the `SEEDED_KEY`
  flow is unchanged.
- 2026-10-15 — Removed the Settings "Reset to Demo" card, its confirm dialog, the
  `useResetDemoData` hook and the `RotateCcw` import; "Delete all data" is now the only
  destructive action.
- 2026-10-15 — Playwright now starts the dev server (`WORKBOARD_NO_OPEN=1` keeps it from
  opening a browser) so E2E runs dogfooded against the real backlog; the redundant build step
  in the CI e2e job is gone. E2E assertions were rewritten from placeholder titles to real WB
  ones, and specs made robust against seeded titles that happen to contain words the locators
  matched (`Select` → `exact: true`; the dashboard heading → role-based locator). The
  persistence spec's Reset-to-Demo test was deleted with the feature.
- 2026-10-15 — Verified the production bundle carries no seed payload (grep of `dist/assets`
  for seed titles: clean). New `devSeed.test.ts` covers the dev path and asserts the prod path
  returns `null` via `vi.stubEnv('DEV', false)`; `migrations.test.ts` now asserts the seeded
  counts equal the generated import. Gates: 362 unit tests, 154 E2E passed / 2 skipped, size
  167 KB gzip JS (budget 200 KB), seed absent from `dist`.
