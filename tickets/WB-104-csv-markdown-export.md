---
id: WB-104
title: Add CSV and Markdown export plus a printable board
status: todo
priority: medium
project: t1-quick-wins
assignee: unassigned
tags: tier:1, area:storage, area:ux, type:feature
created: 2026-10-14
updated: 2026-10-14
source: competitor-analysis
---

## Summary

JSON export/import exists, but it is machine-oriented. Reinforce Workboard's data-ownership
story with human-friendly outputs: CSV for spreadsheets, Markdown for docs and status reports,
and a print/PDF view of a board.

## Acceptance criteria

- [ ] Settings offers CSV export of tasks (and projects) with stable column headers and RFC 4180 escaping.
- [ ] Settings offers Markdown export of the current backlog (reuse the BACKLOG.md table shape).
- [ ] A print stylesheet renders the project board and task list cleanly for PDF (no nav chrome).
- [ ] Export actions are keyboard accessible and announce completion.
- [ ] Round-trip unit tests prove exported CSV parses back to the same values.
- [ ] Documentation in README and `docs/project-management.md` describes each format.

## Notes

- Keep generation in a pure function so it is unit-testable without the DOM.
- Reuse `date-fns` formatting already used in the app; do not hand-roll date strings.
