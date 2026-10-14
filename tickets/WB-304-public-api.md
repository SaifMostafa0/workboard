---
id: WB-304
title: Design a public API and webhooks for automation
status: todo
priority: low
project: t3-platform
assignee: unassigned
tags: tier:3, area:sync, area:docs, type:spike
created: 2026-10-14
updated: 2026-10-14
source: competitor-analysis
---

## Summary

Workboard has no integration surface, which blocks automation and dev-tool wiring where Jira and
Linear excel. The local-first architecture makes a hosted API a product decision, so start with a
design spike rather than an implementation.

## Acceptance criteria

- [ ] A design document defines resources, endpoints, auth model, and versioning.
- [ ] At least one concrete integration scenario is walked through end-to-end (e.g. create task from a webhook payload).
- [ ] The proposal states how a public API coexists with the offline/local-only default, including a self-hosted option.
- [ ] Security review covers auth, rate limiting, and data exposure for a client-owned data model.
- [ ] The recommendation is captured in `docs/decisions/` with an explicit decision on build vs defer.

## Notes

- This is deliberately a spike: it depends on the sync decision in `WB-201`.
- Do not expose user data without an explicit, documented consent model.
