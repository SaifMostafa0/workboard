---
id: WB-404
title: Include labels and saved views in export/import
status: done
priority: high
project: product-gaps
assignee: agent:opencode
tags: area:storage, area:docs, type:bug, gap:data
created: 2026-10-14
updated: 2026-10-14
source: code-audit
---

## Summary

Foundation: the app exposes Labels and Saved Views, and both have repositories and full CRUD,
but the backup format silently omits them. `exportDataSchema` / `importDataSchema`
(`src/domain/validation.ts`) only cover `projects`, `tasks` and `settings`, and
`exportAllData` / `importData` (`src/infrastructure/storage/migrations.ts`) never touch the
label or saved-view stores. A user who exports, clears, and re-imports loses their labels and
saved views without warning. That breaks the data-ownership promise.

## Acceptance criteria

- [x] The export payload includes `labels` and `savedViews` (optional fields for backward compatibility with existing backups).
- [x] Import restores labels and saved views, respecting merge vs replace semantics consistently with projects/tasks.
- [x] Older backups without those fields still import successfully.
- [x] Relationship validation covers any cross-references (e.g. a saved view referencing a label).
- [x] Export/import round-trip tests include labels and saved views, plus a legacy-payload test.
- [x] README documents exactly what a backup contains.

## Notes

- Verify how labels and saved views are keyed in storage (`workboard:labels:*`, `workboard:savedViews:*`) before wiring `getAll`/`set`.
- This is a correctness bug disguised as a feature gap; treat it as high priority despite the small surface area.

## Updates

- 2026-10-14 — Implemented. `src/domain/validation.ts` now exports `labelSchema` / `savedViewSchema`, and `exportDataSchema` / `importDataSchema` include `labels` + `savedViews` (`.default([])` so legacy backups still import). While in there, `settings` was added to `exportDataSchema` — it was previously stripped on export because Zod drops unknown keys, so preferences never actually round-tripped. `src/infrastructure/storage/migrations.ts` exports/imports/clears the label and saved-view stores, `ImportResult` now reports `labelsCreated` / `savedViewsCreated`, and `importData` runs `validateImportRelationships` at the storage boundary (returning a typed `ValidationError`, which the import hook surfaces as the toast message). `validateImportRelationships` was extended to detect duplicate label and saved-view IDs; there are no true cross-collection references to check, because tasks use free-text `tags` (not label IDs) and a saved view's `project` filter is a soft reference that simply matches nothing when absent — this is documented in the code comment.
- Also updated: `useImportData` / `useClearAllData` / `useResetDemoData` invalidate the label and saved-view queries; Settings copy and README state the backup contents. Tests: `validation.test.ts` (+8) and `migrations.test.ts` (+5, incl. legacy payload, replace-clears-labels, orphan-task rejection), plus a new E2E round-trip in `persistence.spec.ts` that creates a label, exports, deletes everything, imports, and asserts it is restored. Gates: lint, typecheck, 304 unit tests, build, persistence E2E all green.
