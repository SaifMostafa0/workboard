---
id: WB-303
title: Add due-date reminders and in-app notifications
status: done
priority: low
project: t3-platform
assignee: agent:opencode
tags: tier:3, area:ux, area:storage, type:feature
created: 2026-10-14
updated: 2026-10-28
source: readme-gaps
---

## Summary

The app surfaces overdue tasks passively on the dashboard. Add reminders so upcoming due dates
reach the user without them opening the app.

## Acceptance criteria

- [x] A notifications centre lists tasks that are due soon or overdue.
- [x] Optional browser notifications are requested and scheduled with user consent, degrading gracefully when denied.
- [x] Users can configure a lead time (e.g. remind 1 day before due).
- [x] Preferences persist with the existing settings repository.
- [x] No network calls; scheduling is local (Notification API / service worker if `WB-305` lands first).
- [x] Tests cover the "which tasks are due for a reminder" pure function.

## Updates

**2026-10-28 — done**

- `/reminders` (`RemindersPage`) is the in-app centre: overdue, due-today and upcoming groups with
  task links, priority ordering and empty states.
- Settings → Reminders exposes lead time (on the due date, 1, 3 or 7 days) and opt-in desktop
  notifications. Enabling asks for permission; a denial or unsupported browser shows an inline
  explanation and leaves the in-app centre fully usable. Turning it off needs no permission.
- `useBrowserReminderNotifications` notifies once per task/due-date/kind (tracked in
  `localStorage`), only while the app is open. No network calls, no service-worker push.
- `getReminderCandidates` is a pure, injected-clock function; tests cover boundaries, exclusion of
  done/deleted/malformed tasks, zero/negative lead times, ordering and the dedupe key.

## Notes

- Depends on `WB-305` (PWA/service worker) for reliable background reminders; in-app list can ship first.
- Respect the reduced-motion and accessibility conventions used by toasts.
