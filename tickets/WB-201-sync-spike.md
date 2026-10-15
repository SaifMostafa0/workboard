---
id: WB-201
title: Spike — optional self-hostable sync behind the repository interface
status: done
priority: high
project: t2-differentiators
assignee: agent:opencode
tags: tier:2, area:sync, area:storage, type:spike
created: 2026-10-14
updated: 2026-10-16
source: competitor-analysis
---

## Summary

Workboard's biggest gap versus Jira, Trello and Linear is collaboration and multi-device use.
Rather than surrender the offline/local-first identity, add an **optional, self-hostable** sync
path implemented behind the existing `IProjectRepository` / `ITaskRepository` interfaces. This is
a timeboxed spike to de-risk the approach before committing to a build.

## Acceptance criteria

- [x] A written spike report documents the options (CRDT via Yjs/Automerge vs a small REST API vs WebSocket relay) with trade-offs for an offline-first app.
- [x] A working prototype demonstrates `ApiRepository` (or a sync layer) satisfying the same repository contract used by hooks.
- [x] The prototype proves optimistic updates and the `Result<T, E>` error model still hold when a network is involved.
- [x] A recommendation with effort estimate and a migration path is recorded in `docs/decisions/`.
- [x] No change to existing behaviour when sync is disabled (local-only remains the default).

## Notes

- `docs/architecture.md` already lists "Swap LocalRepository → ApiRepository" as the intended extension point; validate that claim with real code.
- Bedrock constraint: existing components and hooks must not change.
- Explicitly out of scope: hosted SaaS, accounts, billing.

## Updates

- 2026-10-16 — **Spike report + ADR.** Added [`docs/decisions/0001-sync-architecture.md`](../docs/decisions/0001-sync-architecture.md)
  (with a [`docs/decisions/README.md`](../docs/decisions/README.md) index): evaluates CRDT sync
  (Yjs/Automerge) vs a small REST record API vs a WebSocket relay, records the decision
  (REST behind the storage port, LWW on `updatedAt`), a ~2-week effort estimate and a 5-step
  migration path.
- 2026-10-16 — **Prototype.** New `src/infrastructure/sync/`: an `HttpClient` transport port
  (`http.ts`, separating transport failure from HTTP status), `createRemoteStorageAdapter` (a
  `StorageAdapter` over HTTP that maps every failure to `Result.err`), and `createApi*Repository`
  factories (`apiRepositories.ts`) that mount the **existing** repository factories on top of it.
  A fake REST server (`testing/inMemoryApiServer.ts`) provides latency/fault injection and
  JSON-style cloning for tests.
- 2026-10-16 — **Proof.** A shared contract suite (`testing/repositoryContract.ts`) runs the _same_
  assertions against the local repo (`FakeStorageAdapter`) and the API repo (in-memory HTTP server);
  both pass, so the `IProjectRepository`/`ITaskRepository` interfaces are portable across the wire.
  Adapter tests cover transport failure, 5xx and unreadable-body → `Result.err`; client-side
  validation rejects bad input before any request. An `optimisticUpdates` harness mirroring
  `useUpdateTask` (`onMutate` → `onError` rollback → `onSettled` refetch) proves the cache updates
  immediately, reconciles on success, and rolls back on a 500. 40 new tests.
- 2026-10-16 — **Finding / correction to the claim.** The real extension seam is `StorageAdapter`,
  not the repository classes: mounting the existing repositories over a remote adapter satisfies the
  interfaces with zero repository/hook/component changes. The only hardcoded spot is the
  module-level wiring in `useData.ts`; enabling sync is a one-line change per collection there.
  `docs/architecture.md` updated accordingly. Surfaced gaps for a real build: no `NETWORK_ERROR`
  variant in `StorageError`; batch ops amplify to N requests over the wire; server-side paging is
  still not possible at the record level (the WB-403 deferral stands).
- 2026-10-16 — **No behaviour change.** Nothing in `src/app` or `src/hooks` imports the sync layer,
  so local-only remains the default and the prototype is tree-shaken out of the production bundle.
  Gates green: 441 unit tests (33 files, +40), lint, typecheck, format, coverage 85.33%/78.48%,
  bundle 168 KB gzip JS / 11 KB CSS. (Also corrected a stale "virtualization not needed" line in
  `docs/architecture.md`.)
