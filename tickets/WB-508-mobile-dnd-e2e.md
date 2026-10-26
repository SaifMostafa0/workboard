---
id: WB-508
title: Un-skip and fix the mobile Kanban drag E2E tests
status: done
priority: medium
project: eng-ai-dx
assignee: agent:opencode
tags: area:ci, area:ux, type:test
created: 2026-10-14
updated: 2026-10-26
source: handoff
---

## Summary

`HANDOFF_COMPLETE.md` notes that the Kanban drag-and-drop E2E tests are skipped on mobile and
that drag is exercised via dispatched events. Mobile users currently rely on the status-button
fallback. Close the test gap and make the mobile interaction genuinely usable.

## Acceptance criteria

- [x] Mobile Kanban E2E specs run unskipped against a touch/pointer emulation.
- [x] Drag works on touch devices, or the status-button fallback is proven sufficient and the skip
      is replaced by an explicit test of that path.
- [x] Keyboard-accessible status change is verified for parity.
- [x] The `jsx-a11y` relaxations taken for DnD are revisited now that the interaction is settled.
- [x] No flakiness: the suite passes repeatedly in CI.

## Decision

Native HTML5 drag-and-drop is not exposed to scripts on touch browsers, so shipping a second
pointer-based drag implementation would add complexity without improving the core action. The
supported mobile path is the existing status button on each Kanban card: it is a full-width touch
target and the same button is keyboard operable.

`e2e/kanban-dnd.spec.ts` now branches on the Playwright device instead of skipping:

- Desktop dispatches the native HTML5 drag events and drops the card into another column.
- Mobile clicks the card's **Start** status button and asserts the same move.
- A separate keyboard test focuses **Start**, presses Enter, and asserts the same move.

No `test.skip` remains in the Kanban spec. The only remaining skip is the desktop-only sidebar
collapse test in `e2e/persistence.spec.ts`.

## Notes

- Keep any HTML5 DnD or pointer-event implementation consistent across desktop and mobile.
- The mobile status controls are the accessibility fallback; do not hide them behind hover-only UI.

## Updates

### 2026-10-26 — done

- Reworked `e2e/kanban-dnd.spec.ts` to run unskipped on both `chromium` and `mobile-chrome`.
  Desktop uses dispatched HTML5 drag events; touch uses the status-button path; a second test
  verifies keyboard operation.
- Removed the global `jsx-a11y/no-noninteractive-element-interactions` override from
  `eslint.config.js`. Lint passes with the plugin defaults because the drag handlers are not
  non-interactive click handlers.
- Documented the mobile strategy in `docs/testing-strategy.md` and marked the drag-drop keyboard
  alternative in `docs/accessibility.md`.
- Verified with `--repeat-each=5` and the full CI gate.
