# ADR 0002 — Public API and webhooks for automation

- **Status:** Accepted (spike complete — see WB-304)
- **Date:** 2026-10-26
- **Deciders:** maintainer
- **Related:** [`docs/architecture.md`](../architecture.md), [`docs/decisions/0001-sync-architecture.md`](0001-sync-architecture.md), ticket [`WB-304`](../../tickets/WB-304-public-api.md)

## Context

Workboard is intentionally local-first with no backend, accounts, or network access. The competitor analysis (WB-501) identified automation/integration as a gap versus Jira, Trello and Linear. A public API and webhooks would allow task creation from external tools (CI, scripts, forms) and event-driven automation. However, exposing data requires care given the offline-first and privacy-preserving model.

This ADR captures the design spike from WB-304: what resources/endpoints/auth/versioning look like, how it coexists with the local-only default, the self-hosted option, and a recommendation on build vs defer.

## Resources

The API should mirror the domain model but remain stable and versioned:

| Resource          | Operations                                                                                                          | Notes                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Projects          | `GET/POST/PUT/PATCH/DELETE /v1/projects`                                                                            | CRUD for projects; deletion moves to trash in line with app semantics.                                                                     |
| Tasks             | `GET/POST/PUT/PATCH/DELETE /v1/tasks`                                                                               | CRUD with filters (project, status, assignee, tags, due date ranges). Include subtasks/epics/dependencies in expanded form when requested. |
| Epics             | `GET/POST/PUT/PATCH/DELETE /v1/epics`                                                                               | Above tasks within a project.                                                                                                              |
| Labels            | `GET/POST/PUT/PATCH/DELETE /v1/labels`                                                                              | Global labels.                                                                                                                             |
| Comments/Activity | `GET /v1/tasks/:id/activity`, `POST /v1/tasks/:id/comments`                                                         | Read-only history plus comment creation. Activity is append-only.                                                                          |
| Attachments       | `GET /v1/tasks/:id/attachments`, `POST /v1/tasks/:id/attachments`, `DELETE /v1/tasks/:id/attachments/:attachmentId` | Binary upload/download; respect size limits. Blobs may require separate storage in self-hosted deployments.                                |
| Webhooks          | `GET/POST/PUT/DELETE /v1/webhooks`                                                                                  | Manage webhook subscriptions.                                                                                                              |

## Endpoints (proposed shape)

All endpoints are under `/v1/`. Responses use JSON with consistent error shapes:

```json
{ "error": { "code": "validation_error", "message": "...", "details": [...] } }
```

- **Auth**: Bearer tokens (e.g. `Authorization: Bearer <token>`). For self-hosted single-user, a personal access token (PAT) with scoped permissions is simplest. For multi-user, OAuth2 client credentials or authorization code flow.
- **Versioning**: URI versioning (`/v1/`) with deprecation headers (`Sunset`, `Deprecation`) when moving versions.
- **Pagination**: Cursor-based pagination for lists (`cursor`, `limit`) with `nextCursor` in response metadata.
- **Rate limiting**: Per-token and per-IP limits (e.g. `X-RateLimit-*` headers). Sliding window or token bucket.
- **Idempotency**: Support `Idempotency-Key` header for non-idempotent operations (POST) to prevent duplicate creates.

### Example scenario: Create task from webhook payload

1. External system (CI) receives an event and POSTs to a configured webhook endpoint.
2. Webhook receiver validates signature (HMAC-SHA256 of body with shared secret), authenticates via token or webhook-specific key.
3. Receiver maps payload to internal shape and calls `POST /v1/tasks` with idempotency key.
4. API validates with Zod schemas (same as app), creates task via repository layer, emits `task_created` activity.
5. API returns `201 Created` with task JSON and `Location` header.

## Coexistence with local-only default

- **Default remains local-only.** The public API is opt-in and disabled by default. No network calls occur without explicit configuration.
- **Same domain layer.** API handlers must use the same pure domain functions and repository interfaces as the UI (`UI → hooks → domain → repositories → storage adapter`). No business logic in HTTP layer.
- **Offline-first preserved.** The browser app continues to work with IndexedDB/localStorage. Enabling API sync is independent of local storage.
- **Feature flagging.** API server mode is toggled via configuration (env vars or settings), not compiled into the default client bundle in a way that phones home.

## Self-hosted option

A self-hosted deployment is strongly preferred over a managed service to preserve data ownership:

- **Reference server**: Minimal REST server (e.g. Node/Fastify or similar) that implements the same storage contract. Can use SQLite/Postgres or file-backed storage.
- **Containerized**: Docker image for easy self-hosting.
- **Single-user first**: Start with single-tenant, token auth. Multi-tenant adds complexity.
- **Local network**: Can run on LAN without exposing to internet.
- **Data portability**: API must be compatible with JSON export format for backup/restore.

## Security review

| Concern          | Mitigation                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| AuthN/Z          | Personal access tokens with scopes (read/write/admin). Rotate tokens. Secure storage.                 |
| Transport        | HTTPS required in production. Reject HTTP in non-local environments.                                  |
| Data exposure    | Principle of least privilege. Tokens scoped per resource/action. No public unauthenticated endpoints. |
| Rate limiting    | Prevent abuse/DoS. Per-token quotas.                                                                  |
| Input validation | Zod validation on all inputs (same schemas as app). Sanitize filenames for attachments.               |
| Webhook security | HMAC signature verification, replay protection (timestamp + nonce), IP allowlists optional.           |
| CORS             | Strict CORS policy for browser clients.                                                               |
| Secrets          | No secrets in logs. Use secure secret storage.                                                        |
| Attachments      | Virus scanning out of scope initially; enforce size/type limits; store outside web root.              |

## Build vs defer recommendation

**Defer to post-MVP.** Rationale:

- **High operational cost**: Auth, hosting, security, rate limiting, and maintenance are non-trivial.
- **Not needed for portfolio goals**: The app already demonstrates the full feature set as a local-first tool.
- **Sync path exists**: ADR 0001 defines a lower-lift path (adapter swap to remote storage) that could enable multi-device sync without a full public API.
- **Better timing**: If demand exists or for a specific integration need, build against this design. The design is ready.

**If we do build**: Start with a minimal read-only API for a single resource, add write operations incrementally, and only self-host first. Do not build a managed multi-tenant service initially.

## Action items (if revisited)

1. Implement reference server in separate repo with OpenAPI spec.
2. Add API client in app behind feature flag.
3. Generate SDK/types from OpenAPI.
4. Add webhook delivery with retries and dead letter queue.
5. Security audit before exposing publicly.
