---
id: WB-502
title: Establish a ticket system with a machine-readable backlog
status: done
priority: high
project: eng-ai-dx
assignee: agent:opencode
tags: area:docs, area:ci, type:docs
created: 2026-10-14
updated: 2026-10-14
source: product-management
---

## Summary

Work needs a durable home that both humans and agents can read. Drive the backlog from canonical
markdown tickets (`tickets/WB-*.md`) with flat YAML frontmatter, and generate a human/agent index
(`BACKLOG.md`) plus a Workboard-importable snapshot from that single source of truth.

## Acceptance criteria

- [x] A ticket format is defined (frontmatter fields, allowed values, tag taxonomy) and documented.
- [x] `scripts/tickets-build.mjs` deterministically generates `project-management/workboard-import.json` and `BACKLOG.md` from `tickets/WB-*.md`.
- [x] The generated import validates against the app's own Zod import schema (projects, tasks, tags, statuses, dates).
- [x] A `--check` mode fails when generated artifacts are stale.
- [x] A machine-readable `project-management/ticket.schema.json` describes the frontmatter for external tooling.
- [x] npm scripts `tickets:build` and `tickets:check` are wired up.

## Notes

- Frontmatter is intentionally flat `key: value` scalars so parsing stays trivial and stable under formatting.
- Only `projects`, `tasks` and `settings` are importable; labels/saved views are a known export gap (`WB-404`).

## Updates

- 2026-10-14 — Built the ticket format, generator, schema and npm scripts; seeded the initial 26-ticket backlog.
