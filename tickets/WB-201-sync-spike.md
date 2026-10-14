---
id: WB-201
title: Spike — optional self-hostable sync behind the repository interface
status: todo
priority: high
project: t2-differentiators
assignee: unassigned
tags: tier:2, area:sync, area:storage, type:spike
created: 2026-10-14
updated: 2026-10-14
source: competitor-analysis
---

## Summary

Workboard's biggest gap versus Jira, Trello and Linear is collaboration and multi-device use.
Rather than surrender the offline/local-first identity, add an **optional, self-hostable** sync
path implemented behind the existing `IProjectRepository` / `ITaskRepository` interfaces. This is
a timeboxed spike to de-risk the approach before committing to a build.

## Acceptance criteria

- [ ] A written spike report documents the options (CRDT via Yjs/Automerge vs a small REST API vs WebSocket relay) with trade-offs for an offline-first app.
- [ ] A working prototype demonstrates `ApiRepository` (or a sync layer) satisfying the same repository contract used by hooks.
- [ ] The prototype proves optimistic updates and the `Result<T, E>` error model still hold when a network is involved.
- [ ] A recommendation with effort estimate and a migration path is recorded in `docs/decisions/`.
- [ ] No change to existing behaviour when sync is disabled (local-only remains the default).

## Notes

- `docs/architecture.md` already lists "Swap LocalRepository → ApiRepository" as the intended extension point; validate that claim with real code.
- Bedrock constraint: existing components and hooks must not change.
- Explicitly out of scope: hosted SaaS, accounts, billing.
