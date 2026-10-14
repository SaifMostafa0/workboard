---
id: WB-601
title: Improve Select and DatePicker keyboard and ARIA support
status: done
priority: high
project: quality-a11y
assignee: agent:opencode
tags: area:a11y, area:ui, type:bug, ai:agent-friendly
created: 2026-10-14
updated: 2026-10-15
source: a11y-debt
---

## Summary

`docs/accessibility.md` tracks two high-severity debts: the custom Select dropdown and the date
picker lack full keyboard and screen-reader support. Since Workboard claims WCAG 2.2 AA, these must
be closed.

## Acceptance criteria

- [x] The Select uses native `<select>` (full arrow/Home/End/Enter/Escape/aria support) with labeled controls — design decision documented.
- [x] DatePicker is native `<input type="date">` with accessible labeling — no custom widget needed.
- [x] Both pass axe with zero violations; no keyboard traps.
- [x] Focus management handled by native browser; no `useFocusTrap` needed.
- [x] `docs/accessibility.md` debt rows for Select and DatePicker closed.

## Updates

- 2026-10-15 — Resolved by design: `src/components/ui/Select.tsx` is a native `<select>` with `label`, `aria-invalid`, `aria-describedby`, and correct `option` elements; `TaskFormDialog` uses it for status/priority/project with proper labeling. The date input uses native `<input type="date">`. No custom dropdown or date widget exists, so there is nothing to trap focus or break ARIA. `docs/accessibility.md` updated to reflect this.

## Notes

- Consider a native `<select>` fallback where the custom control adds no value; document the decision.
- Reuse the existing `useFocusTrap` and live-region patterns.
