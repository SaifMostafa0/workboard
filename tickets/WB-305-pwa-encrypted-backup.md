---
id: WB-305
title: Ship a PWA with install and encrypted local backup
status: todo
priority: medium
project: t3-platform
assignee: unassigned
tags: tier:3, area:ux, area:storage, type:feature
created: 2026-10-14
updated: 2026-10-14
source: competitor-analysis
---

## Summary

Workboard works offline in the browser but is not installable. A PWA makes the offline-first
promise tangible and closes part of the platform gap with native apps.

## Acceptance criteria

- [ ] A service worker precaches the app shell and assets; the app loads offline after first visit.
- [ ] A web app manifest (name, icons, theme colours) enables install on desktop and mobile.
- [ ] An update flow prompts the user to reload when a new version is available.
- [ ] An optional encrypted backup exports data protected by a user passphrase (Web Crypto).
- [ ] Cache strategy is documented and does not break SPA deep links.
- [ ] Lighthouse PWA checks pass and no performance budget regressions.

## Notes

- Coordinate with `WB-303` (notifications) which benefits from a service worker.
- Encryption must be documented clearly: a lost passphrase means lost data.
