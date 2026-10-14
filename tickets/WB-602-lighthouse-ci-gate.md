---
id: WB-602
title: Wire a Lighthouse CI performance budget gate
status: todo
priority: medium
project: quality-a11y
assignee: unassigned
tags: area:perf, area:ci, type:chore
created: 2026-10-14
updated: 2026-10-14
source: performance-doc
---

## Summary

`docs/performance.md` defines Lighthouse and Core Web Vitals targets and a `lighthouse-budget.json`,
but the numbers are aspirational because nothing runs them in CI. Turn the budgets into a gate.

## Acceptance criteria

- [ ] A GitHub Actions job runs Lighthouse against the production preview for `/`, `/projects`, `/tasks`, `/settings`.
- [ ] The existing `lighthouse-budget.json` is enforced; the job fails on regressions below target.
- [ ] Measured results are recorded in `docs/performance.md` (replacing the template with real numbers).
- [ ] The bundle-size budget check is part of the same job or a sibling job.
- [ ] The job is documented in the README CI section.

## Notes

- Keep thresholds in the budget file, not hard-coded in the workflow.
- If lab variance causes flakes, use median-of-runs with a small tolerance and document it.
