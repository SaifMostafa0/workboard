# Workboard — Implementation Plan

## Milestone 1: Repository Setup & Architecture Documentation ✓

- [x] Inspect repository (empty)
- [x] Create PROJECT_SPEC.md
- [x] Create IMPLEMENTATION_PLAN.md
- [ ] Create docs/architecture.md
- [ ] Create docs/testing-strategy.md
- [ ] Create docs/decisions/ directory
- [ ] Initialize Vite + React + TypeScript project
- [ ] Install dependencies
- [ ] Configure ESLint, Prettier, TypeScript
- [ ] Set up Vitest, React Testing Library, Playwright

## Milestone 2: Domain Layer & Persistence

- [ ] Define TypeScript domain types (Project, Task, enums)
- [ ] Create Zod validation schemas
- [ ] Implement repository interfaces
- [ ] Implement IndexedDB storage adapter (using idb)
- [ ] Implement localStorage fallback
- [ ] Create repository implementations
- [ ] Add migration logic for schema versions
- [ ] Write unit tests for domain functions
- [ ] Write unit tests for repositories
- [ ] Run tests and verify coverage

## Milestone 3: Application Shell & Design System

- [ ] Create design tokens (colors, spacing, typography, shadows, radii)
- [ ] Implement CSS Modules architecture
- [ ] Build UI component library (Button, Input, Select, Dialog, Table, Card, Badge, Icon)
- [ ] Create layout components (Sidebar, Header, Main, Footer)
- [ ] Implement feedback components (Toast, Alert, Loading, EmptyState)
- [ ] Set up React Router with all routes
- [ ] Create App.tsx and providers (QueryClient, Theme)
- [ ] Implement theme switching (light/dark)
- [ ] Add global styles and reset
- [ ] Verify responsive breakpoints

## Milestone 4: Projects Feature

- [ ] Project list page with search
- [ ] Project creation dialog/form with validation
- [ ] Project edit dialog/form
- [ ] Project deletion with confirmation and cascade
- [ ] Project detail page with task board
- [ ] Project repository integration
- [ ] Project hooks (useProjects, useProject)
- [ ] Write component/integration tests
- [ ] Verify accessibility

## Milestone 5: Tasks Feature

- [ ] Task list page (global and project-scoped)
- [ ] Task creation dialog/form with all fields
- [ ] Task edit dialog/form
- [ ] Task deletion with confirmation
- [ ] Task detail view
- [ ] Status change controls (kanban-style or inline)
- [ ] Priority, tags, due date, assignee inputs
- [ ] Overdue indicator
- [ ] Task repository integration
- [ ] Task hooks (useTasks, useTask)
- [ ] Write component/integration tests
- [ ] Verify accessibility

## Milestone 6: Search, Filters, Sorting, Pagination

- [ ] URL query parameter synchronization
- [ ] Filter toolbar component
- [ ] Text search (debounced)
- [ ] Multi-select filters (project, status, priority)
- [ ] Due date / overdue filter
- [ ] Sort controls (field + direction)
- [ ] Pagination component
- [ ] Results count display
- [ ] Clear all filters action
- [ ] Zero results vs empty state handling
- [ ] Write integration tests for filter combinations
- [ ] Verify shareable URLs

## Milestone 7: Dashboard, Settings, Data Management

- [ ] Dashboard page with derived metrics
- [ ] Recent activity feed
- [ ] Empty state with shortcuts
- [ ] Settings page
- [ ] Theme preference persistence
- [ ] Demo data reset
- [ ] JSON export functionality
- [ ] JSON import with validation and merge/overwrite options
- [ ] Import validation (size, schema, IDs, relationships)
- [ ] Write tests for import/export

## Milestone 8: Accessibility, Responsive, Error Recovery

- [ ] Semantic HTML and landmark audit
- [ ] Heading hierarchy verification
- [ ] Keyboard navigation testing
- [ ] Focus management for dialogs
- [ ] Screen reader announcements for async changes
- [ ] Color contrast verification
- [ ] Reduced motion support
- [ ] Touch target sizing
- [ ] Error boundaries and recovery UI
- [ ] Storage failure handling
- [ ] Unsaved changes protection
- [ ] Automated a11y tests (axe-core)

## Milestone 9: E2E Tests, Performance, CI

- [ ] Configure Playwright
- [ ] Write E2E tests for all critical journeys:
  - [ ] First launch with demo data
  - [ ] Create project
  - [ ] Create and edit task
  - [ ] Change status/priority
  - [ ] Search and combine filters
  - [ ] Delete task
  - [ ] Delete project (cascade)
  - [ ] Reload and verify persistence
  - [ ] Import invalid data
  - [ ] Keyboard navigation
  - [ ] Direct route loading
  - [ ] Storage failure recovery
- [ ] Configure CI pipeline (GitHub Actions)
- [ ] Run Lighthouse CI
- [ ] Measure and document performance
- [ ] Verify coverage thresholds

## Milestone 10: Deployment & Documentation

- [ ] Build production bundle
- [ ] Deploy to static host (Vercel/Netlify/GitHub Pages)
- [ ] Configure SPA fallback
- [ ] Write README with setup instructions
- [ ] Create architecture diagram
- [ ] Write testing and quality summary
- [ ] Write technical case study (3+ engineering decisions)
- [ ] Document known limitations
- [ ] Take screenshots / record demo video
- [ ] Final verification against Definition of Done

---

## Commands Reference

### Development

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
```

### Testing

```bash
npm run test         # Run unit/integration tests (Vitest)
npm run test:ui      # Vitest UI
npm run test:coverage # Coverage report
npm run test:e2e     # Playwright E2E tests
npm run test:e2e:ui  # Playwright UI
```

### Quality

```bash
npm run lint         # ESLint
npm run format       # Prettier
npm run typecheck    # TypeScript check
```

### CI Simulation

```bash
npm run ci           # Run all checks (lint, typecheck, test, build, e2e)
```

---

## Risk Mitigation

| Risk                    | Mitigation                                                                         |
| ----------------------- | ---------------------------------------------------------------------------------- |
| IndexedDB complexity    | Start with localStorage, migrate to IndexedDB if needed                            |
| TanStack Query overhead | Only introduce when async server-state exists; use local state for sync operations |
| Scope creep             | Strictly follow milestones; no new features until DoD met                          |
| Accessibility gaps      | Test with keyboard/screen reader at each milestone                                 |
| Performance regressions | Measure at Milestone 9, not before                                                 |
| CI failures             | Run all checks locally before push                                                 |
