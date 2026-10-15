# Project Management — Workboard on Workboard

Workboard is managed **with Workboard itself** (dogfooding). Work is planned, tracked and
executed from a single backlog, and the same information is kept in three synchronized views so
that humans, the app, and AI agent teams can all work from it.

This document is the contract. If you change how work is tracked, update this file.

---

## 1. Sources of truth

| Artifact                                   | Role                                                  | Who edits it          | Regenerated?           |
| ------------------------------------------ | ----------------------------------------------------- | --------------------- | ---------------------- |
| `tickets/WB-*.md`                          | **Canonical** ticket definitions (frontmatter + body) | humans & agents       | no                     |
| `project-management/workboard.config.json` | Projects (slug, id, name, colour)                     | humans                | no                     |
| `project-management/ticket.schema.json`    | Machine-readable frontmatter schema                   | humans                | no                     |
| `BACKLOG.md`                               | Human/agent index of all tickets                      | —                     | `tickets:build`        |
| `project-management/workboard-import.json` | Importable Workboard dataset                          | —                     | `tickets:build`        |
| The Workboard app (IndexedDB)              | Day-to-day driver (views, DnD, statuses)              | anyone working        | seeded by import (dev) |
| `STATUS.md`                                | Living snapshot of current state                      | whoever finishes work | no                     |

**Rule:** the ticket markdown files win. Everything generated is derived. If the app and the
tickets disagree, correct the tickets and rebuild.

---

## 2. Ticket format

Each ticket is a markdown file named `WB-###-slug.md`. `scripts/tickets-build.mjs` only picks up
files matching `WB-*.md`, so `tickets/README.md` and other notes are ignored.

```markdown
---
id: WB-101
title: Finish Saved Views — apply saved filters on the Tasks page
status: todo
priority: high
project: t1-quick-wins
assignee: unassigned
tags: tier:1, area:ux, area:state, type:feature
created: 2026-10-14
updated: 2026-10-14
source: competitor-analysis
---

## Summary

Why this exists, in one short paragraph.

## Acceptance criteria

- [ ] A verifiable, testable outcome.
- [ ] Another one.

## Notes

Optional context, links, decisions, dependencies.

## Updates

- 2026-10-14 — Created.
```

Frontmatter is **flat `key: value` scalars** on purpose: trivial to parse, stable under
formatting, and easy for any agent. Do not use nested YAML or arrays in frontmatter. Lists
(`tags`, cross-references) are comma-separated strings.

### Allowed values

- **status**: `todo`, `in_progress`, `done`
- **priority**: `low`, `medium`, `high`, `urgent`
- **project**: any slug in `project-management/workboard.config.json`
- **assignee**: `unassigned`, `human:<name>`, or `agent:<name>`
- **dates**: `YYYY-MM-DD`

### Required body sections

Every ticket needs `## Summary` and `## Acceptance criteria`. `## Notes` and `## Updates` are
optional. The generator fails the build if required sections or fields are missing.

### Tag taxonomy

Tags are cheap metadata that also become Workboard task tags. Keep to ≤10 per ticket.

- `area:` — `domain`, `ui`, `ux`, `state`, `storage`, `perf`, `a11y`, `docs`, `ci`, `sync`
- `type:` — `feature`, `bug`, `chore`, `test`, `spike`, `docs`
- `tier:` — `1`, `2`, `3` (roadmap tier)
- `gap:` — `hierarchy`, `scale`, `data`, `collaboration`
- `source:` / free-form — `competitor-analysis`, `readme-gaps`, `handoff`, and similar

---

## 3. Status workflow

```
todo ──► in_progress ──► done
```

- `todo` — not started.
- `in_progress` — actively being worked. Keep this honest; one or two at a time.
- `done` — acceptance criteria met **and** docs/tests updated. Set `updated` and add an `## Updates` entry.

Trash/deletion is a Workboard-app affordance, not a ticket status. Prefer closing a ticket as
`done` with a note explaining a descope over deleting it.

---

## 4. The loop

### Editing in markdown (default for agents)

```bash
# 1. Create or edit tickets/WB-###-*.md
# 2. Regenerate the index and import file
npm run tickets:build
# 3. Commit tickets + BACKLOG.md + workboard-import.json together
```

### Working in the Workboard app (default for humans)

```bash
# 1. Start the app
npm run dev            # http://localhost:5173
# 2. Settings → Import → project-management/workboard-import.json  (mode: replace for a clean board)
# 3. Move tasks, change status/priority, drag on the board
# 4. Settings → Export to download workboard-export-<date>.json
npm run tickets:sync workboard-export-<date>.json
npm run tickets:build
```

`tickets:sync` matches exported tasks back to tickets by the `WB-###` title prefix and writes
`status`, `priority`, `assignee` and `updated` into the frontmatter, logging status changes under
`## Updates`.

> **Fixed:** as of [WB-404](../tickets/WB-404-export-labels-saved-views.md) the app's export includes
> labels, saved views and preferences, so an export is a full backup. (Previously it omitted them.)

---

## 5. Definition of done

A ticket is only done when **all** of these hold:

- [ ] Acceptance criteria are met.
- [ ] `npm run lint`, `npm run typecheck`, and `npm run test:run` pass.
- [ ] New behaviour has tests; new UI has an accessibility check.
- [ ] Relevant docs are updated (README, `docs/*`, this file, or `STATUS.md`).
- [ ] `npm run tickets:build` has been run and generated files are committed.
- [ ] The ticket is marked `done` with an `## Updates` entry.

CI enforces the parts that can be automated: `npm run tickets:check` fails when `BACKLOG.md` or
the import file are stale.

---

## 6. Working with AI agent teams

The repository is deliberately agent-friendly:

- **`AGENTS.md`** at the root is the first thing an agent reads.
- **Tickets are deterministic and file-based** — no external service is required to read or write them.
- **Flat frontmatter + a JSON Schema** (`ticket.schema.json`) make tickets machine-validatable.
- **Stable ids** — a ticket's Workboard task id is derived deterministically from its `WB-###` id, so re-importing never duplicates rows.
- **One command to stay in sync** — `npm run tickets:build` / `tickets:check`.

Guidance for agents picking up work:

1. Read `AGENTS.md`, then this file.
2. Choose a ticket (highest priority, unblocked) and set `status: in_progress`, `assignee: agent:<you>`, bump `updated`.
3. Implement against the acceptance criteria; keep changes consistent with the codebase patterns.
4. Run the quality gates.
5. Update docs and the ticket (`status: done`, `## Updates`), then `npm run tickets:build`.

Prefer many small, independently verifiable tickets over one large one. If scope grows, split the
ticket and link the parts in `## Notes`.
