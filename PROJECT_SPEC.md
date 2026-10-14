# Workboard — Project Specification

## Overview

Workboard is a polished, responsive project and task management application demonstrating professional frontend engineering practices. It serves as a portfolio-grade software engineering project with real working interactions, clear domain logic, reliable data persistence, automated tests, documentation, and public deployment.

## Technology Stack

- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: TanStack Query (for async server-state operations)
- **Forms**: React Hook Form + Zod for validation
- **Testing**: Vitest (unit/integration), React Testing Library, Playwright (E2E)
- **Linting/Formatting**: ESLint + Prettier
- **Icons**: Lucide React
- **Styling**: CSS Modules with design tokens
- **Package Manager**: npm
- **Storage**: IndexedDB (via idb) with localStorage fallback

## Domain Model

### Project

```typescript
interface Project {
  id: string;
  name: string;
  description: string;
  color: ProjectColor; // controlled palette identifier
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}
```

### Task

```typescript
interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus; // 'todo' | 'in_progress' | 'done'
  priority: TaskPriority; // 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: string; // optional ISO date (calendar date)
  assignee?: string; // optional display name
  tags: string[];
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  completedAt?: string; // optional ISO timestamp
}
```

## Routes

- `/` — Dashboard
- `/projects` — Project list
- `/projects/:projectId` — Project details and task board
- `/tasks` — Global task list
- `/settings` — Display preferences and data management
- Unknown paths — 404 page

## Core Features

### Dashboard

- Total projects, total tasks, tasks in progress, completed tasks, overdue tasks
- Upcoming due dates
- Recent activity / recently updated tasks
- Empty state with creation shortcuts

### Projects

- CRUD operations with validation
- Search projects
- Task counts and completion progress
- Confirmation for destructive actions
- Cascade delete tasks on project deletion

### Tasks

- CRUD operations with full field support
- Status changes from detail view and list
- Priority, tags, due dates, assignee
- Overdue display
- Project reference validation

### Search & Filters

- Text search (title, description) - case insensitive
- Project filter
- Status filter
- Priority filter
- Due date / overdue filter
- Sort by: title, created, due date, priority, updated
- Ascending/descending
- Pagination with configurable page size
- Combined filters use AND semantics
- URL query parameters for shareable state
- Clear all filters action
- Zero results vs empty database distinction

### Forms

- Field-level validation
- Input preservation on validation failure
- Duplicate submission guard
- Visible submission status
- Keyboard navigation
- Unsaved changes protection

### Settings & Data Management

- Theme preference (light/dark)
- Demo data reset
- JSON export
- Validated JSON import (with merge/overwrite options)
- Import size/schema/ID/relationship validation

## Architecture

### File Structure

```
src/
  app/
    App.tsx
    router.tsx
    providers.tsx
  components/
    ui/
    layout/
    feedback/
  features/
    dashboard/
      components/
      hooks/
      pages/
    projects/
      components/
      hooks/
      pages/
      schemas/
      services/
    tasks/
      components/
      hooks/
      pages/
      schemas/
      services/
    settings/
      components/
      pages/
  domain/
    project.ts
    task.ts
    errors.ts
    validation.ts
  infrastructure/
    storage/
      storageAdapter.ts
      localRepository.ts
      migrations.ts
    repositories/
      projectRepository.ts
      taskRepository.ts
  hooks/
  lib/
  styles/
  test/
    fixtures/
    factories/
    setup.ts
  main.tsx

docs/
  architecture.md
  testing-strategy.md
  accessibility.md
  performance.md
  decisions/

e2e/
  dashboard.spec.ts
  projects.spec.ts
  tasks.spec.ts
  filters.spec.ts
  persistence.spec.ts
```

### Architectural Boundaries

- UI components render state and communicate through props/hooks
- Domain functions contain pure business rules
- Repositories own persistence operations
- Schemas validate user input and imported data
- UI components never call storage APIs directly
- No `any` types; use `unknown` with runtime validation
- Discriminated unions for result states
- Centralized date, ID, and formatting utilities

## Acceptance Criteria

### Definition of Done

- [ ] All core project and task workflows work
- [ ] Filtering, sorting, pagination, and persistence work together
- [ ] Data validation and failure recovery implemented
- [ ] Critical accessibility requirements verified (WCAG 2.2 AA)
- [ ] Required tests pass in CI
- [ ] Production build succeeds
- [ ] Deployed application loads and supports direct routes
- [ ] Documentation matches implementation
- [ ] All displayed metrics are measured and reproducible
- [ ] No known critical or high-severity defects remain

### Quality Targets

- TypeScript: 0 errors
- ESLint: 0 errors
- Unit/Integration test coverage: ≥80% statements, ≥75% branches for domain/repo code
- E2E tests: All critical user journeys covered
- Lighthouse Performance: ≥90
- Lighthouse Accessibility: ≥95
- Lighthouse Best Practices: ≥95
- Lighthouse SEO: ≥90
- Core Web Vitals (lab): LCP ≤2.5s, INP ≤200ms, CLS ≤0.1

## Implementation Milestones

1. **Milestone 1**: Repository inspection, requirements, architecture docs
2. **Milestone 2**: Domain types, validation, repository interfaces, persistence tests
3. **Milestone 4**: Application shell, routing, navigation, design tokens
4. **Milestone 4**: Project CRUD and associated tests
5. **Milestone 5**: Task CRUD, validation, and associated tests
6. **Milestone 6**: Search, filters, sorting, pagination
7. **Milestone 7**: Dashboard, data management, settings
8. **Milestone 8**: Accessibility, responsive behavior, error recovery
9. **Milestone 9**: E2E tests, performance measurements, CI
10. **Milestone 10**: Deployment, documentation, portfolio case study
