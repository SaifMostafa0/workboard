---
id: WB-303
title: Add due-date reminders and in-app notifications
status: todo
priority: low
project: t3-platform
assignee: unassigned
tags: tier:3, area:ux, area:storage, type:feature
created: 2026-10-14
updated: 2026-10-14
source: readme-gaps
---

## Summary

The app surfaces overdue tasks passively on the dashboard. Add reminders so upcoming due dates
reach the user without them opening the app.

## Acceptance criteria

- [ ] A notifications centre lists tasks that are due soon or overdue.
- [ ] Optional browser notifications are requested and scheduled with user consent, degrading gracefully when denied.
- [ ] Users can configure a lead time (e.g. remind 1 day before due).
- [ ] Preferences persist with the existing settings repository.
- [ ] No network calls; scheduling is local (Notification API / service worker if `WB-305` lands first).
- [ ] Tests cover the "which tasks are due for a reminder" pure function.

## Notes

- Depends on `WB-305` (PWA/service worker) for reliable background reminders; in-app list can ship first.
- Respect the reduced-motion and accessibility conventions used by toasts.
