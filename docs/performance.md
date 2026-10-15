# Workboard — Performance Strategy

## Target Metrics (Lab Environment)

| Metric                          | Target | Measurement                          |
| ------------------------------- | ------ | ------------------------------------ |
| Lighthouse Performance          | ≥90    | Lighthouse CI (Chromium, mobile sim) |
| Lighthouse Accessibility        | ≥95    | Lighthouse CI                        |
| Lighthouse Best Practices       | ≥95    | Lighthouse CI                        |
| Lighthouse SEO                  | ≥90    | Lighthouse CI                        |
| LCP (Largest Contentful Paint)  | ≤2.5s  | Lighthouse / WebPageTest             |
| INP (Interaction to Next Paint) | ≤200ms | Lighthouse / WebPageTest             |
| CLS (Cumulative Layout Shift)   | ≤0.1   | Lighthouse / WebPageTest             |
| Bundle Size (JS gzipped)        | ≤100KB | `vite build --mode=analyze`          |
| Initial HTML                    | ≤5KB   | Network tab                          |

## Measurement Methodology

### Lab Testing (CI)

```bash
# Local Lighthouse run
npm run build
npm run preview -- --port 4173 &
npx lighthouse http://localhost:4173 --preset=mobile --output=json --output-path=lighthouse-report.json
```

### Lighthouse CI Configuration

```yaml
# .github/workflows/lighthouse.yml
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci && npm run build
      - uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            http://localhost:4173
            http://localhost:4173/projects
            http://localhost:4173/tasks
          budgetPath: ./lighthouse-budget.json
          uploadArtifacts: true
```

### Budget File

```json
// lighthouse-budget.json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["error", { "minScore": 0.95 }],
        "categories:seo": ["error", { "minScore": 0.9 }]
      }
    }
  }
}
```

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

## Performance Budget by Route

| Route           | JS (gz) | CSS (gz) | LCP Target |
| --------------- | ------- | -------- | ---------- |
| `/` (Dashboard) | ≤35KB   | ≤8KB     | ≤1.8s      |
| `/projects`     | ≤40KB   | ≤8KB     | ≤2.0s      |
| `/projects/:id` | ≤45KB   | ≤10KB    | ≤2.2s      |
| `/tasks`        | ≤40KB   | ≤8KB     | ≤2.0s      |
| `/settings`     | ≤25KB   | ≤5KB     | ≤1.5s      |

## Regression Detection

### CI Performance Gate

```bash
# Fail if bundle exceeds budget
npx bundlesize
```

```json
// package.json
"bundlesize": [
  { "path": "dist/assets/index-*.js", "maxSize": "100KB" },
  { "path": "dist/assets/index-*.css", "maxSize": "15KB" }
]
```

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

| Milestone     | Checks                                 |
| ------------- | -------------------------------------- |
| 3 (Shell)     | Bundle <50KB, LCP <1.5s on empty shell |
| 4 (Projects)  | List renders 100 projects <100ms       |
| 5 (Tasks)     | List renders 500 tasks <150ms          |
| 6 (Filters)   | Filter 500 tasks <50ms (no UI lag)     |
| 7 (Dashboard) | Derived metrics compute <10ms          |
| 9 (E2E)       | Full Lighthouse CI pass                |

## Reporting

### Performance Report Template

```markdown
## Performance Report - [Date]

### Environment

- Device: [Mobile Moto G4 / Desktop]
- Network: [Throttled 3G / Cable]
- Browser: Chrome [version]
- Build: [commit SHA]

### Results

| Route         | LCP  | INP   | CLS  | Score |
| ------------- | ---- | ----- | ---- | ----- |
| /             | 1.2s | 84ms  | 0.02 | 96    |
| /projects     | 1.4s | 92ms  | 0.01 | 94    |
| /projects/123 | 1.6s | 110ms | 0.03 | 92    |
| /tasks        | 1.3s | 88ms  | 0.01 | 95    |

### Bundle Analysis

- Total JS: 87KB gzipped
- Largest chunk: vendor-React (42KB)
- CSS: 11KB gzipped

### Regressions

- None detected

### Improvements Since Last Run

- Lazy-loaded ProjectDetailPage (-8KB initial)
- Memoized TaskRow (-15ms filter)
```
