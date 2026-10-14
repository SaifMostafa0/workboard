---
id: WB-504
title: Enforce ticket/backlog sync in CI
status: done
priority: medium
project: eng-ai-dx
assignee: agent:opencode
tags: area:ci, type:chore, ai:agent-friendly
created: 2026-10-14
updated: 2026-10-14
source: product-management
---

## Summary

Generated artifacts drift the moment someone forgets to regenerate. Wire `tickets:check` into the
local `ci` script and the GitHub Actions workflow so stale tickets or a stale backlog fail the
build.

## Acceptance criteria

- [x] `npm run tickets:check` verifies `BACKLOG.md` and `workboard-import.json` are up to date.
- [x] The check is part of the `ci` npm script.
- [x] The GitHub Actions `quality` job runs the check before tests.
- [x] Generated files are excluded from Prettier so `format:check` stays green.
- [x] The failure message tells the contributor exactly what to run.

## Notes

- `--check` normalizes CRLF vs LF so the gate is reliable on Windows and Linux.
- Keep the check dependency-free and fast (no build required).

## Updates

- 2026-10-14 — Added `tickets:check` to the `ci` script and CI workflow; added generated files to `.prettierignore`.
