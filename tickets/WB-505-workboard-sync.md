---
id: WB-505
title: Add a Workboard-to-ticket sync script
status: done
priority: medium
project: eng-ai-dx
assignee: agent:opencode
tags: area:docs, area:storage, type:feature, ai:agent-friendly
created: 2026-10-14
updated: 2026-10-14
source: product-management
---

## Summary

To dogfood Workboard as the daily driver, progress made in the app must flow back into the
canonical tickets. Add `scripts/tickets-sync.mjs` to fold a Workboard export back into ticket
frontmatter (status, priority, assignee, updated) and append an update-log entry.

## Acceptance criteria

- [x] The script accepts a Workboard export JSON path and matches tasks to tickets by `WB-###` title prefix.
- [x] Status, priority, assignee and updated date are written back to the correct ticket files.
- [x] A dated entry is appended to `## Updates` when the status changes.
- [x] Trashed tasks (`deletedAt`) and unmatched tickets are reported, not silently ignored.
- [x] The recommended loop (import → work → export → sync → build) is documented in `docs/project-management.md`.

## Notes

- This closes the round-trip: ticketing in the app, truth in markdown.
- The export now includes labels and saved views ([WB-404](WB-404-export-labels-saved-views.md) resolved), so an export is a complete backup.

## Updates

- 2026-10-14 — Added `scripts/tickets-sync.mjs` and the `tickets:sync` npm script.
