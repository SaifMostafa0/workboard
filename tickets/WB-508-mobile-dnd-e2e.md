---
id: WB-508
title: Un-skip and fix the mobile Kanban drag E2E tests
status: todo
priority: medium
project: eng-ai-dx
assignee: unassigned
tags: area:ci, area:ux, type:test
created: 2026-10-14
updated: 2026-10-14
source: handoff
---

## Summary

`HANDOFF_COMPLETE.md` notes that the Kanban drag-and-drop E2E tests are skipped on mobile and
that drag is exercised via dispatched events. Mobile users currently rely on the status-button
fallback. Close the test gap and make the mobile interaction genuinely usable.

## Acceptance criteria

- [ ] Mobile Kanban E2E specs run unskipped against a touch/pointer emulation.
- [ ] Drag works on touch devices, or the status-button fallback is proven sufficient and the skip is replaced by an explicit test of that path.
- [ ] Keyboard-accessible status change is verified for parity.
- [ ] The `jsx-a11y` relaxations taken for DnD are revisited now that the interaction is settled.
- [ ] No flakiness: the suite passes repeatedly in CI.

## Notes

- Decide the mobile strategy first (real drag vs fallback) and document it; the accessibility story follows from that.
- Keep any HTML5 DnD or pointer-event implementation consistent across desktop and mobile.
