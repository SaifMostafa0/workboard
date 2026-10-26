# Workboard — Performance Strategy

## Target Metrics (Lab Environment)

These are **enforced budgets**, not aspirational targets. Lighthouse score and metric limits live
in [`lighthouse-budget.json`](../lighthouse-budget.json); gzip limits live in
[`scripts/check-bundle-size.mjs`](../scripts/check-bundle-size.mjs). Change either in a dedicated PR
with before/after measurements.

| Metric                          | Target | Measurement                                |
| ------------------------------- | ------ | ------------------------------------------ |
| Lighthouse Performance          | ≥90    | Lighthouse CI (mobile, 3-run median)       |
| Lighthouse Accessibility        | ≥95    | Lighthouse CI                              |
| Lighthouse Best Practices       | ≥95    | Lighthouse CI                              |
| Lighthouse SEO                  | ≥90    | Lighthouse CI                              |
| FCP (First Contentful Paint)    | ≤2.5s  | Lighthouse CI                              |
| LCP (Largest Contentful Paint)  | ≤2.5s  | Lighthouse CI                              |
| TBT (Total Blocking Time)       | ≤200ms | Lighthouse CI (lab proxy for INP)          |
| TTI (Time to Interactive)       | ≤3.5s  | Lighthouse CI (legacy)                     |
| CLS (Cumulative Layout Shift)   | ≤0.1   | Lighthouse CI                              |
| INP (Interaction to Next Paint) | ≤200ms | Field data / WebPageTest                   |
| Bundle Size (JS gzipped)        | ≤200KB | `npm run size`                             |
| Bundle Size (CSS gzipped)       | ≤20KB  | `npm run size`                             |
| Initial HTML                    | ≤5KB   | `npm run build` output (`dist/index.html`) |

## Measurement Methodology

### Lab Testing (CI)

The `lighthouse` job in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) builds the
production bundle, checks the gzip bundle budget, then runs Lighthouse CI against the production
preview. [`lighthouse-budget.json`](../lighthouse-budget.json) starts
`npm run preview -- --port 4173 --strictPort`, audits `/`, `/projects`, `/tasks`, and `/settings`,
and runs each URL three times. Every assertion uses the **median** run; reports are uploaded as the
`lighthouse-results` artifact.

Reproduce the gate locally:

```bash
npm run build
npx --yes @lhci/cli@0.15.1 autorun --config=./lighthouse-budget.json
```

If Chrome is not discoverable, point `CHROME_PATH` at the installed binary first. The CI action
(`treosh/lighthouse-ci-action@v12`) pins Lighthouse 12.6; `@lhci/cli@0.15.1` uses the same
Lighthouse version.

### Lighthouse CI Configuration

The workflow stays deliberately thin: thresholds and collection details belong in the budget file,
not in YAML. The job is:

```yaml
lighthouse:
  name: Lighthouse CI & bundle budget
  runs-on: ubuntu-latest
  needs: quality
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version-file: .nvmrc
        cache: npm
    - run: npm ci
    - run: npm run build
    - run: npm run size
    - uses: treosh/lighthouse-ci-action@v12
      with:
        configPath: ./lighthouse-budget.json
        uploadArtifacts: true
        artifactName: lighthouse-results
```

### Budget File

`lighthouse-budget.json` is an LHCI configuration file as well as the threshold source:

- `collect` starts the production preview, lists the audited URLs, and sets `numberOfRuns: 3`.
- `assert.assertions` holds every score and metric threshold. Numeric and category assertions use
  `"aggregationMethod": "median"`, so one slow run cannot fail the build and one fast run cannot
  hide a regression.
- The workflow passes no thresholds or URLs; it only points at this file.

Example assertion:

```json
"categories:performance": ["error", { "minScore": 0.9, "aggregationMethod": "median" }]
```

If lab variance still causes flakes, add a small tolerance here (for example a slightly lower
`minScore` or higher `maxNumericValue`) rather than weakening the workflow. Document the reason next
to the threshold.

## List Scaling Benchmarks (measured)

The task list is filtered, sorted and sliced by **pure domain functions** (`src/domain/taskQuery.ts`)
and rendered through a dependency-free windowing component (`src/components/ui/VirtualList.tsx`).
Both are covered by a repeatable benchmark:

```bash
npm run bench   # vitest bench --run --reporter=verbose
```

- `src/domain/__tests__/taskQuery.bench.ts` — the filter → sort → paginate pipeline at 1k / 10k / 50k tasks.
- `src/components/ui/__tests__/VirtualList.bench.tsx` — rendering 50,000 rows with windowing on vs off.

### Environment

| Item    | Value                      |
| ------- | -------------------------- |
| Machine | AMD Ryzen 5 7600X (6 core) |
| OS      | Windows 11 (10.0.26300)    |
| Node    | v24.21.0                   |
| Runner  | Vitest 5 (tinybench)       |
| Date    | 2026-10-16                 |

Numbers are the **mean** per call from a single run and are only meaningful relative to each other
on the same machine. Re-run `npm run bench` to compare.

### `queryTasks` (filter → sort → paginate)

| Tasks  | Default (top-level, sorted by `updatedAt`) | Filtered (search + status + priority sort) |
| ------ | ------------------------------------------ | ------------------------------------------ |
| 1,000  | 0.28 ms                                    | 0.10 ms                                    |
| 10,000 | 4.8 ms                                     | 1.9 ms                                     |
| 50,000 | 26 ms                                      | 10 ms                                      |

The default query sorts every top-level task, so it is dominated by the sort; the filtered query
narrows the set first and is consequently faster. The pipeline runs off the render path (inside a
React Query fetch), so even the 50k worst case (~26 ms) does not block typing or scrolling — the UI
keeps showing the previous page while the next one resolves.

### `VirtualList` render of 50,000 items

| Mode                    | Mean render | Relative       |
| ----------------------- | ----------- | -------------- |
| Windowed (threshold 30) | 0.07 ms     | ~3,000× faster |
| Unwindowed (no cap)     | 214 ms      | baseline       |

Windowing renders only the rows near the viewport (plus overscan), so render cost is **constant** in
the number of items and the DOM stays a fixed size. The unwindowed column exists only to show the
difference; production never renders an entire list.

### How the ceiling was raised

The old "~10,000 tasks" ceiling came from three compounding costs, each removed or bounded:

1. **Storage** — reads are key-range scoped in `indexedDBAdapter`, so a list never deserialises the
   whole store.
2. **Filtering/sorting** — runs in pure domain functions, and the list view asks the repository for a
   single page (`taskRepository.listPage`) instead of holding every task in React state.
3. **Rendering** — the list is windowed above a threshold, so DOM node count is bounded regardless of
   collection size. Short lists (≤ threshold) render in full, unchanged, so keyboard navigation and
   the existing E2E flows behave exactly as before.

The projects grid uses the same component (`useGridColumns` computes the responsive column count).

## Performance Optimization Strategy

### 1. Code Splitting

```tsx
// src/app/router.tsx
import { lazy, Suspense } from 'react';

const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const ProjectsPage = lazy(() => import('@/features/projects/pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('@/features/projects/pages/ProjectDetailPage'));
const TasksPage = lazy(() => import('@/features/tasks/pages/TasksPage'));
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage'));
const NotFoundPage = lazy(() => import('@/app/pages/NotFoundPage'));

// Suspense boundary in App.tsx
<Suspense fallback={<PageSkeleton />}>
  <Routes>...</Routes>
</Suspense>;
```

### 2. Bundle Analysis

```bash
# Analyze bundle
npm run build -- --mode=analyze
# Opens stats.html with rollup-plugin-visualizer
```

```typescript
// vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
});
```

### 3. Dependency Audit

```bash
# Check for large dependencies
npm run build 2>&1 | grep -E "(chunk|asset)" | sort -k3 -hr | head -20
# Or use:
npx vite-bundle-analyzer dist
```

### 4. React Optimizations

```tsx
// Memoize list items
const TaskRow = memo(function TaskRow({ task, onClick }: TaskRowProps) {
  return <tr onClick={onClick}>...</tr>;
});

// Stable callbacks
const handleStatusChange = useCallback(
  (id: TaskId, status: TaskStatus) => {
    updateTaskStatus.mutate({ id, status });
  },
  [updateTaskStatus]
);

// Memoize derived computations
const filteredTasks = useMemo(() => filterTasks(allTasks, filters), [allTasks, filters]);
const sortedTasks = useMemo(() => sortTasks(filteredTasks, sortConfig), [filteredTasks, sortConfig]);
const paginatedTasks = useMemo(() => paginate(sortedTasks, page, pageSize), [sortedTasks, page, pageSize]);
```

### 5. CSS Optimization

- CSS Modules: Scoped, tree-shakeable
- Critical CSS inlined via Vite (experimental)
- No CSS-in-JS runtime

### 6. Image/Assets

- SVG icons via Lucide (tree-shaken)
- No raster images in initial load
- Favicon + manifest only

### 7. Caching Strategy

```nginx
# Netlify/Vercel headers
/cache-control: public, max-age=31536000, immutable  # /assets/*.[hash].js
/cache-control: public, max-age=0, must-revalidate   # index.html
/cache-control: public, max-age=86400                # manifest.json
```

## Performance Monitoring in Code

### Web Vitals Collection (Production)

```typescript
// src/lib/webVitals.ts
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

export function initWebVitals() {
  if (import.meta.env.PROD) {
    onCLS(sendToAnalytics);
    onINP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onFCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
  }
}

function sendToAnalytics(metric: Metric) {
  // Send to analytics endpoint or log
  console.log('[Web Vitals]', metric.name, metric.value, metric.rating);
}
```

### Render Performance Profiling

```tsx
// Dev-only render tracker
if (import.meta.env.DEV) {
  import('react-dom').then(({ unstable_trace }) => {
    unstable_trace('TaskList render', performance.now(), () => {});
  });
}
```

## Enforced Budgets

| Asset                 | Budget    | Enforced by                   |
| --------------------- | --------- | ----------------------------- |
| Total JavaScript      | 200KB     | `npm run size` (gzip)         |
| Total CSS             | 20KB      | `npm run size` (gzip)         |
| Per-route LCP/TBT/CLS | See above | `lighthouse-budget.json`      |
| Initial HTML          | 5KB       | `npm run build` output review |

The bundle check measures the **sum of every gzipped asset**, so code splitting does not hide a
regression in a lazily loaded chunk. Route-level performance is enforced through Lighthouse metrics
rather than guessed per-route KB budgets, which would need constant manual maintenance.

## Regression Detection

### CI Performance Gate

Two checks run on every PR and fail the job on a regression:

1. `npm run size` fails when the gzipped JS or CSS totals exceed their budgets.
2. `treosh/lighthouse-ci-action@v12` runs Lighthouse CI from `lighthouse-budget.json` and fails
   when any category score or metric misses its threshold.

The Lighthouse HTML/JSON reports are uploaded as the `lighthouse-results` artifact, making a failed
gate debuggable without re-running it locally.

## Common Pitfalls to Avoid

| Pitfall                           | Solution                                                                   |
| --------------------------------- | -------------------------------------------------------------------------- |
| Large icon library imported fully | Use `lucide-react` tree-shaking (ESM)                                      |
| Moment.js / date-fns full import  | Use `date-fns` subpath imports: `import { format } from 'date-fns/format'` |
| Inline object creation in render  | Move to `useMemo` or module scope                                          |
| Missing `key` on lists            | Always use stable IDs                                                      |
| Synchronous storage in render     | Use async storage + React Query / state                                    |
| Unnecessary context re-renders    | Split contexts by update frequency                                         |

## Performance Checklist per Milestone

| Milestone     | Checks                                        |
| ------------- | --------------------------------------------- |
| 3 (Shell)     | Shell within bundle budget, LCP <1.5s locally |
| 4 (Projects)  | List renders 100 projects <100ms              |
| 5 (Tasks)     | List renders 500 tasks <150ms                 |
| 6 (Filters)   | Filter 500 tasks <50ms (no UI lag)            |
| 7 (Dashboard) | Derived metrics compute <10ms                 |
| 9 (E2E)       | Lighthouse and bundle gates pass on every PR  |

## Reporting

### Measured Baseline — 2026-10-26

Environment:

- Windows 11, Node v24.21.0, Chrome 155.0.8059.85
- Lighthouse 12.6.1 via `@lhci/cli` 0.15.1
- Production build served by `vite preview` on port 4173
- Lighthouse mobile emulation with default throttling
- 3 runs per URL; **median** values below

| Route       | Perf | A11y | Best Practices | SEO | FCP   | LCP   | TBT   | TTI   | CLS |
| ----------- | ---- | ---- | -------------- | --- | ----- | ----- | ----- | ----- | --- |
| `/`         | 96   | 100  | 100            | 100 | 2.26s | 2.26s | 0ms   | 2.26s | 0   |
| `/projects` | 96   | 100  | 100            | 100 | 2.26s | 2.26s | 0ms   | 2.26s | 0   |
| `/tasks`    | 96   | 100  | 100            | 100 | 2.26s | 2.26s | 0ms   | 2.26s | 0   |
| `/settings` | 96   | 100  | 100            | 100 | 2.26s | 2.26s | 3.5ms | 2.29s | 0   |

Bundle analysis from the same build:

- Total JavaScript: **184.96 kB gzipped** (budget 200 kB)
- Total CSS: **15.39 kB gzipped** (budget 20 kB)
- Largest chunk: `vendor` (React, React Router) at 75.44 kB gzipped
- Initial HTML: **1.06 kB** (budget 5 kB)

All assertions passed; there were no regressions to grandfather. CI runners are slower and noisier
than this workstation, so treat these numbers as a baseline rather than an SLA — the thresholds in
`lighthouse-budget.json` and `scripts/check-bundle-size.mjs` are the gate.

Refresh this section with:

```bash
npm run build
npm run size
npx --yes @lhci/cli@0.15.1 autorun --config=./lighthouse-budget.json
```

Then take the median score/metric per URL from the generated `.lighthouseci/lhr-*.json` reports.
