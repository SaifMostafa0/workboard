# ADR 0001 — Optional self-hostable sync behind the repository API

- **Status:** Accepted (spike complete — see WB-201)
- **Date:** 2026-10-16
- **Deciders:** maintainer
- **Related:** [`docs/architecture.md`](../architecture.md), ticket
  [`WB-201`](../../tickets/WB-201-sync-spike.md)

## Context

Workboard is deliberately local-first: no backend, no accounts, no network. The largest gap versus
Jira, Trello and Linear is therefore **collaboration and multi-device use** (see
[`COMPETITOR_ANALYSIS.md`](../../COMPETITOR_ANALYSIS.md)). The goal is to close some of that gap
**without surrendering the offline-first identity**: the app must keep working with no network and
no server, and adding sync must be opt-in.

The architecture was designed with an escape hatch. The layering is
`UI → hooks → domain → repositories → storage adapter`, and every repository is a pure function of a
`StorageAdapter`:

```ts
createProjectRepository(adapter: StorageAdapter): IProjectRepository
createTaskRepository(adapter: StorageAdapter): ITaskRepository
```

`useData.ts` builds these once from `indexedDBAdapter` (or `localStorageAdapter`). Hooks, pages and
components only ever see the `I*Repository` interfaces and the `Result<T, E>` return type, so they
are agnostic to where bytes actually live.

This ADR records the outcome of a timeboxed spike (WB-201) that asked: **can we put the data
somewhere remote, behind the same contract, without rewriting the app — and what is the smallest
change that gets us there?**

## Options considered

Three shapes were evaluated against the offline-first requirements (works offline, no data loss on
conflict, modest operational burden, plausibly self-hostable).

### 1. CRDT sync (Yjs / Automerge)

Model tasks and projects as CRDT documents and sync them peer-to-peer or via a relay.

- **Pros:** true offline + concurrent editing; automatic, deterministic conflict resolution with no
  server-side merge logic; designed for exactly this problem.
- **Cons:** the domain model is a plain-JSON, "last write wins" record store, not a document. Adopting
  a CRDT means a new binary-ish document format, a change to _every_ read path, and a much larger
  runtime dependency (Automerge/Yjs + a provider) against a ≤100 KB bundle budget. Conflict semantics
  are also overkill for a single user's devices.
- **Verdict:** right tool for real-time multi-user co-editing; wrong tool for "my laptop and my
  desktop". Rejected for now.

### 2. Minimal REST API (record sync over HTTP)

A small server exposes the key-value collections over HTTP; the client keeps using its local store
and pushes/pulls records.

- **Pros:** tiny surface; maps almost 1:1 onto the existing `StorageAdapter` (`get` / `set` /
  `delete` / `getAll` / `getKeys` / `clear`); trivially self-hostable (any JSON store); no new client
  dependency; the pure domain layer (filter/sort/paginate/aggregate) keeps running client-side.
- **Cons:** no automatic conflict resolution — needs a policy (`updatedAt` last-write-wins, or
  per-record version/revision). Requires trust/transport hardening (auth, TLS) for real use.
- **Verdict:** **chosen for the prototype.** Lowest change, lowest risk, preserves every design
  property.

### 3. WebSocket relay / live channel

A persistent connection pushes changes to other connected clients.

- **Pros:** live updates, presence, cheap polling.
- **Cons:** a transport, not a sync model. It solves _propagation_, not _conflicts_, and a socket
  doesn't help an offline client catch up. It complements (2) rather than replacing it.
- **Verdict:** a later optimisation on top of (2) — "add a WebSocket listener → invalidate the React
  Query cache" is already listed as an extension point. Not the first step.

## Prototype (what WB-201 built)

The spike implemented option 2 at the **lowest possible seam**:

- `src/infrastructure/sync/http.ts` — a tiny transport port (`HttpClient`) that separates a
  _transport failure_ (offline/DNS/abort) from an _HTTP response_, plus a `fetch`-backed client that
  never throws.
- `src/infrastructure/sync/remoteStorageAdapter.ts` — `createRemoteStorageAdapter(client)` implements
  the existing `StorageAdapter` over HTTP and maps every failure to `Result.err`.
- `src/infrastructure/sync/apiRepositories.ts` — `createApiProjectRepository`, `createApiTaskRepository`,
  … mount the **existing** repository factories on top of the remote adapter. Contract conformance
  is achieved _by construction_, not by a parallel implementation that could drift.
- `src/infrastructure/sync/testing/inMemoryApiServer.ts` — a fake REST server (with latency, fault
  injection and JSON-style cloning) so tests exercise the real adapter, not a mock of it.

### How it was proven

- **Contract parity.** A shared suite (`repositoryContract.ts`) runs the _same_ assertions against
  the local repository (`FakeStorageAdapter`) and the API repository (in-memory HTTP server). Both
  pass — the interfaces are genuinely portable across a network boundary.
- **Error model.** A transport failure, a `5xx`, and an unreadable body all surface as `Result.err`
  (never a thrown exception); a `404` on read becomes the repository's `NotFoundError`; client-side
  Zod validation rejects bad input _before_ any request is sent.
- **Optimistic updates.** A harness that mirrors `useUpdateTask` exactly (`onMutate` write →
  `onError` rollback → `onSettled` refetch) runs against the API repository and asserts the cache
  updates immediately, reconciles on success, and rolls back on a `500`.
- **No behaviour change.** Nothing in `src/app` or `src/hooks` imports the sync layer. Local-only is
  still the default, and the sync code is tree-shaken out of the production bundle.

## Decision

Adopt **record-level REST sync behind the `StorageAdapter` port** as the direction for optional sync.
Do **not** introduce a CRDT runtime, and treat WebSockets as a later propagation layer.

Concretely, the recommendation is:

1. Keep `StorageAdapter` as the extension seam. Sync is an **adapter swap**, not a repository or hook
   rewrite.
2. The server is a small, self-hostable JSON store over the same key space
   (`<collection>/<id> → record`).
3. Conflicts are resolved with **last-write-wins on `updatedAt`**, with the door open to add a
   per-record `rev`/version field if needed.
4. Optimistic UI stays entirely in React Query hooks — unchanged.

## Findings worth acting on before a real build

- **The seam is `StorageAdapter`, not `I*Repository`.** Mounting the _existing_ repositories over a
  remote adapter satisfies both interfaces with zero repository changes. This is a stronger result
  than writing a bespoke `ApiRepository`.
- **The only hardcoded spot is the wiring.** `useData.ts` constructs repositories from a concrete
  adapter in module scope; enabling sync is a one-line change per collection there (behind a
  settings flag). This should become an injectable provider/factory rather than module globals.
- **The error model has no network/offline category.** `StorageError['type']` covers quota, corruption,
  permissions … but not "offline". The prototype maps transport failures onto `CORRUPTED_DATA` with a
  descriptive message, which works but is semantically wrong. **Recommendation:** add a
  `NETWORK_ERROR`/`OFFLINE` variant (or a dedicated `SyncError`) before a real build.
- **Sync is at the record (storage-key) level, so it is opaque to the domain.** The server never
  sees a `Task`; it sees a JSON blob under a key. This keeps the server dumb and the domain pure, but
  it also means **server-side paging is still not possible** (the WB-403 deferral stands) — for that,
  the API would need to understand task fields, i.e. a real `ApiRepository` with query endpoints.
- **Batch operations amplify into N requests.** The local repositories implement `updateMany` /
  `deleteMany` / `*ByProject` by iterating; over a network that becomes N round-trips. A production
  API should expose batch endpoints (or a single "apply changes" call).
- **Auth, TLS and tenancy are entirely out of scope here.** A self-hosted server for one user's
  devices needs at least a token and HTTPS; a shared server needs real multi-tenancy.

## Effort estimate (beyond this spike)

For a credible v1 of optional, single-user, multi-device sync:

| Workstream                                             | Estimate     |
| ------------------------------------------------------ | ------------ |
| Reference server (JSON store, REST, LWW, auth token)   | 3–5 days     |
| Client: injectable repository provider + settings flag | 1–2 days     |
| Client: push/pull scheduling, retry/backoff, outbox    | 3–4 days     |
| Error-model change (`NETWORK_ERROR`) + UX for offline  | 1–2 days     |
| Batch endpoints + conflict tests + docs                | 2–3 days     |
| **Total**                                              | **~2 weeks** |

## Migration path

1. Add a `NETWORK_ERROR` (or `SyncError`) variant and handle it in toasts; no behaviour change yet.
2. Replace the module-level repository singletons in `useData.ts` with an injectable provider that
   defaults to the local adapters.
3. Add a "Sync" setting. When enabled, construct repositories with
   `createRemoteStorageAdapter(createFetchHttpClient({ baseUrl }))`.
4. Add an outbox + retry on top of the remote adapter (still behind `StorageAdapter`) for offline
   writes.
5. Only if server-side querying becomes necessary, promote a real `ApiRepository` with query
   endpoints — reusing the same pure domain functions for anything computed client-side.

Each step is independently shippable and leaves the default (local-only) experience untouched.

## Consequences

- **Positive:** a concrete, low-risk path to multi-device use; the local-first default and every
  existing test remain valid; the seam is proven by a shared contract suite rather than asserted.
- **Negative:** true real-time collaboration (the CRDT option) remains unaddressed; conflict handling
  is coarse (LWW); a server introduces auth/ops concerns the app currently has none of.
- **Neutral:** the prototype lives in `src/infrastructure/sync/` and is intentionally **not** wired
  into the app, so it carries no runtime cost.
