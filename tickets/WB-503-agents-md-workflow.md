---
id: WB-503
title: Add AGENTS.md and a documentation-as-code workflow
status: done
priority: high
project: eng-ai-dx
assignee: agent:opencode
tags: area:docs, type:docs, ai:agent-friendly
created: 2026-10-14
updated: 2026-10-14
source: product-management
---

## Summary

Make the repository a first-class environment for AI agent teams. Add a root `AGENTS.md` that
agents read first, and a `docs/project-management.md` process doc that defines the ticket
workflow, sources of truth, and the rule that documentation and tickets are updated as part of
every change.

## Acceptance criteria

- [x] `AGENTS.md` documents project overview, commands, architecture map, conventions, quality gates, and the ticket workflow.
- [x] `docs/project-management.md` defines sources of truth, ticket schema, tag taxonomy, status workflow, and the Workboard round-trip.
- [x] `STATUS.md` provides a living progress snapshot with an update rule.
- [x] The README links to the agent and project-management docs.
- [x] Documentation clearly states that updating tickets and markdown is part of the definition of done.

## Notes

- `AGENTS.md` is the OpenCode/agent convention and is kept short, pointing to deeper docs.
- Keep the workflow tool-agnostic so non-OpenCode agent teams can follow it.

## Updates

- 2026-10-14 — Added `AGENTS.md`, `docs/project-management.md`, `STATUS.md`, and README links.
