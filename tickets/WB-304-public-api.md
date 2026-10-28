---
id: WB-304
title: Design a public API and webhooks for automation
status: done
priority: low
project: t3-platform
assignee: agent:opencode
tags: tier:3, area:sync, area:docs, type:spike
created: 2026-10-14
updated: 2026-10-26
source: competitor-analysis
---

## Summary

Workboard has no integration surface, which blocks automation and dev-tool wiring where Jira and
Linear excel. The local-first architecture makes a hosted API a product decision, so start with a
design spike rather than an implementation.

## Acceptance criteria

- [x] A design document defines resources, endpoints, auth model, and versioning.
- [x] At least one concrete integration scenario is walked through end-to-end (e.g. create task from a webhook payload).
- [x] The proposal states how a public API coexists with the offline/local-only default, including a self-hosted option.
- [x] Security review covers auth, rate limiting, and data exposure for a client-owned data model.
- [x] The recommendation is captured in `docs/decisions/` with an explicit decision on build vs defer.

## Updates

- 2026-10-26: Created ADR 0002 documenting resources, endpoints, auth/versioning, coexistence with local-only default, self-hosted option, security review, and build-vs-defer recommendation with webhook scenario.

## Notes

- This is deliberately a spike: it depends on the sync decision in `WB-201`.
- Do not expose user data without an explicit, documented consent model.
