---
id: WB-104
title: Add CSV and Markdown export plus a printable board
status: done
priority: medium
project: t1-quick-wins
assignee: agent:opencode
tags: tier:1, area:storage, area:ux, type:feature
created: 2026-10-14
updated: 2026-10-26
source: competitor-analysis
---

## Summary

JSON export/import exists, but it is machine-oriented. Reinforce Workboard's data-ownership
story with human-friendly outputs: CSV for spreadsheets, Markdown for docs and status reports,
and a print/PDF view of a board.

## Acceptance criteria

- [x] Settings offers CSV export of tasks (and projects) with stable column headers and RFC 4180 escaping.
- [x] Settings offers Markdown export of the current backlog (reuse the BACKLOG.md table shape).
- [x] A print stylesheet renders the project board and task list cleanly for PDF (no nav chrome).
- [x] Export actions are keyboard accessible and announce completion.
- [x] Round-trip unit tests prove exported CSV parses back to the same values.
- [x] Documentation in README and `docs/project-management.md` describes each format.

## Notes

- Keep generation in a pure function so it is unit-testable without the DOM.
- Reuse `date-fns` formatting already used in the app; do not hand-roll date strings.

## Updates

- 2026-10-26 — Done. Added pure exporters in `src/domain/export.ts` (tasks CSV, projects CSV,
  BACKLOG-shaped Markdown), wired them into Settings with download + live-region announcements,
  added print styles for the board and task list, and covered the writers with 15 domain tests
  (including an RFC 4180 round-trip parser). Added `e2e/exports.spec.ts` for downloads, keyboard
  activation and print media, plus README/project-management docs.
