---
id: WB-403
title: Virtualize long lists and raise the ~10k-task scale ceiling
status: todo
priority: high
project: product-gaps
assignee: unassigned
tags: area:perf, area:ui, type:feature, gap:scale
created: 2026-10-14
updated: 2026-10-14
source: readme-gaps
---

## Summary

`README.md` lists "~10,000 tasks before performance degrades" as a known limitation because all
records are loaded and filtered in memory. Virtualize rendering and move pagination to the
repository layer so the app stays smooth at scale.

## Acceptance criteria

- [ ] Task and project lists render with windowing so DOM node count stays bounded.
- [ ] A repository-level paged query avoids loading every record for list views.
- [ ] Filtering/sorting remain correct and instant for datasets of at least 50k tasks (documented benchmark).
- [ ] A repeatable benchmark script records render and filter timings in `docs/performance.md`.
- [ ] No regression to keyboard navigation, focus order, or the a11y axe checks.
- [ ] Update the "Known Limitations" section of README once the ceiling is raised.

## Notes

- `docs/performance.md` already anticipates virtualization "if measured"; this ticket makes it measured and required.
- Keep the public filter/sort/paginate domain functions; change where they run, not what they do.
