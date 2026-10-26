---
id: WB-602
title: Wire a Lighthouse CI performance budget gate
status: done
priority: medium
project: quality-a11y
assignee: agent:opencode
tags: area:perf, area:ci, type:chore
created: 2026-10-14
updated: 2026-10-26
source: performance-doc
---

## Summary

`docs/performance.md` defines Lighthouse and Core Web Vitals targets and a `lighthouse-budget.json`,
but the numbers are aspirational because nothing runs them in CI. Turn the budgets into a gate.

## Acceptance criteria

- [x] A GitHub Actions job runs Lighthouse against the production preview for `/`, `/projects`, `/tasks`, `/settings`.
- [x] The existing `lighthouse-budget.json` is enforced; the job fails on regressions below target.
- [x] Measured results are recorded in `docs/performance.md` (replacing the template with real numbers).
- [x] The bundle-size budget check is part of the same job or a sibling job.
- [x] The job is documented in the README CI section.

## Updates

- 2026-10-26 — Added a dedicated `lighthouse` GitHub Actions job that runs after `quality`, builds the production bundle, runs `npm run size`, then audits `/`, `/projects`, `/tasks`, and `/settings` through `treosh/lighthouse-ci-action@v12`.
- 2026-10-26 — Repaired `lighthouse-budget.json`: it now starts `vite preview` itself (previous `staticDistDir` was nested under `settings` and never applied), lists all four URLs, runs each URL three times, and asserts **median** values so a single noisy run cannot fail the gate. Thresholds remain in the budget file; the workflow only passes `configPath`.
- 2026-10-26 — Recorded the measured baseline in `docs/performance.md`: 96 Performance / 100 Accessibility / 100 Best Practices / 100 SEO on every route, LCP 2.26s, TBT 0–3.5ms, CLS 0, 184.96 kB gzip JS / 15.39 kB gzip CSS. The CI job uploads Lighthouse reports as the `lighthouse-results` artifact.
- 2026-10-26 — The new gate exposed three pre-existing issues, fixed here: an invalid `role="navigation"` on the sidebar `<aside>`, dark-mode primary/danger contrast (new `--color-on-primary`, `--color-primary-text`, `--color-error-text`, and danger background tokens), and a missing `robots.txt` that made SEO read `/robots.txt` as HTML. Accessibility and SEO now score 100 locally.
- 2026-10-26 — Updated the README CI section, aligned the documented gzip budget with the enforced 200 kB JS / 20 kB CSS check, and ignored generated `.lighthouseci` output.

## Notes

- Keep thresholds in the budget file, not hard-coded in the workflow.
- If lab variance causes flakes, use median-of-runs with a small tolerance and document it.
