# Workboard — Architecture Documentation

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser Environment                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   React App  │  │ React Router │  │   TanStack Query     │  │
│  │  (Components)│◄─┤   (Routes)   │  │   (Async State)      │  │
│  └──────┬───────┘  └──────────────┘  └──────────────────────┘  │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Feature Hooks                           │  │
│  │  (useProjects, useTasks, useDashboard, useSettings)      │  │
│  └──────────────────────────┬────────────────────────────────┘  │
│                             │                                    │
│         ┌────────────────┬───────────────┬───────────────┐      │
│         ▼                ▼               ▼               ▼      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │  Project    │  │    Task     │  │    Epic     │  │Settings │ │
│  │ Repository  │  │ Repository  │  │ Repository  │  │Repo     │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └────┬────┘ │
│         │                │                │              │      │
│         └────────────────┴───────┬────────┴──────────────┘      │
│                                  ▼                              │
│                 ┌─────────────────────┐                         │
│                 │  Storage Adapter    │                         │
│                 │  (IndexedDB/Local)  │                         │
│                 └─────────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

## Layer Responsibilities

### 1. Presentation Layer (`src/components/`, `src/features/*/components/`, `src/features/*/pages/`)

- **UI Components**: Pure presentational components receiving props
- **Pages**: Route-level components composing features
- **No direct storage access**
- **No business logic** — delegate to hooks

### 2. Feature Hooks Layer (`src/features/*/hooks/`, `src/hooks/`)

- **State orchestration**: Combine repository calls with local UI state
- **React Query integration**: For async operations (future API)
- **Optimistic updates**: For immediate feedback
- **Derived state**: Filtering, sorting, pagination logic

### 3. Domain Layer (`src/domain/`)

- **Pure TypeScript**: No React dependencies
- **Types**: `Project`, `Task`, `Epic`, enums, branded types
- **Validation**: Zod schemas for runtime validation
- **Business Rules**: Pure functions for calculations
  - `calculateCompletionPercentage(tasks)`
  - `computeEpicProgress(epicId, tasks)`
  - `isOverdue(task, referenceDate)`
  - `filterTasks(tasks, filters)`
  - `sortTasks(tasks, sortConfig)`
  - `paginate(items, page, pageSize)`

### 4. Repository Layer (`src/infrastructure/repositories/`)

- **Interface**: `IProjectRepository`, `ITaskRepository`, `IEpicRepository`
- **Implementations**: `LocalProjectRepository`, `LocalTaskRepository`, `LocalEpicRepository`
- **Responsibilities**:
  - CRUD operations
  - Query operations (list, search, filter)
  - Relationship integrity (cascade delete; epics **detach** their tasks on delete)
  - Migration handling
- **Error Handling**: Discriminated union results (`Ok<T>` / `Err<StorageError>`)

### 5. Storage Layer (`src/infrastructure/storage/`)

- **StorageAdapter**: Abstract interface for key-value + index operations
- **IndexedDBAdapter**: Primary implementation using `idb`
- **LocalStorageAdapter**: Fallback for unsupported environments
- **Migrations**: Schema version tracking and data transformation
- **Dev seed**: on a fresh profile, development builds import Workboard's own backlog
  (`project-management/workboard-import.json`) via `loadDevSeed()`; the dynamic import is guarded by
  `import.meta.env.DEV`, so production bundles ship no seed data and start empty

## Data Flow

### Read Path (e.g., Project List)

```
Page → useProjects() → ProjectRepository.list() → StorageAdapter.getAll()
                                                            │
Response ◄──────────────────────────────────────────────────┘
```

### Write Path (e.g., Create Task)

```
Form → useCreateTask() → TaskRepository.create() → StorageAdapter.set()
                              │
                              ▼
                    Invalidate React Query cache
                              │
                              ▼
                      Optimistic UI update
```

### Filter/Sort/Pagination (Client-Side)

```
useTasks(filters, sort, pagination)
    → Repository.getAll()
    → Domain: filterTasks() → sortTasks() → paginate()
    → Return { items, totalCount, pageCount }
```

## Key Design Decisions

### 1. Client-Side Filtering Over Server-Side

**Decision**: All filtering, sorting, pagination happens in-memory after fetching all records.
**Rationale**:

- Dataset size: ~100s of tasks, well within memory limits
- Simpler architecture: no query translation layer
- Instant filter feedback
- Works offline
  **Trade-off**: Won't scale to 10k+ records without virtualization/pagination at repository level.

### 2. IndexedDB with localStorage Fallback

**Decision**: Primary storage is IndexedDB via `idb` wrapper; localStorage for Safari private mode / fallback.
**Rationale**:

- IndexedDB: async, larger quota, supports indexing
- localStorage: synchronous, 5MB limit, simpler
- `idb` provides Promise-based API, tiny bundle size

### 3. Repository Returns `Result<T, E>` Not Throws

**Decision**: Repository methods return `Ok<T>` | `Err<StorageError>` discriminated unions.
**Rationale**:

- Forces caller to handle both cases
- No try/catch sprawl in hooks
- Serializable error types for potential future IPC

### 4. Zod for Runtime Validation

**Decision**: All external data (storage, import, form input) validated via Zod schemas.
**Rationale**:

- Single source of truth for types + validation
- Type inference: `z.infer<typeof schema>`
- Detailed error messages for forms

### 5. URL Query Parameters for Filter State

**Decision**: Search, filters, sort, pagination encoded in URL.
**Rationale**:

- Shareable deep links
- Browser back/forward works
- Server-side rendering ready (future)

## Type System Strategy

### Branded Types for IDs

```typescript
type Brand<T, B> = T & { __brand: B };
type ProjectId = Brand<string, 'ProjectId'>;
type TaskId = Brand<string, 'TaskId'>;
```

### Discriminated Unions for Results

```typescript
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

type StorageError =
  | { type: 'QUOTA_EXCEEDED' }
  | { type: 'NOT_FOUND'; key: string }
  | { type: 'CORRUPTED_DATA'; cause: Error }
  | { type: 'UNSUPPORTED_OPERATION' };
```

### Date Handling

- All timestamps stored as ISO 8601 strings (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- Due dates stored as calendar dates (`YYYY-MM-DD`) — no time component
- Single `DateTime` utility class for parsing, formatting, comparison

## Component Architecture

### Compound Components Pattern

```tsx
<Select>
  <Select.Trigger />
  <Select.Content>
    <Select.Item value="a" />
    <Select.Item value="b" />
  </Select.Content>
</Select>
```

### Render Props for Flexible Composition

```tsx
<DataTable>
  {({ rows, sort, filter }) => (
    <>
      <Toolbar sort={sort} filter={filter} />
      <Table.Body rows={rows} />
    </>
  )}
</DataTable>
```

### CSS Modules with Design Tokens

```css
/* styles/tokens.css */
:root {
  --color-primary: #2563eb;
  --color-bg: #ffffff;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --radius-sm: 0.25rem;
  --shadow-1: 0 1px 2px rgba(0, 0, 0, 0.05);
}

/* components/Button/Button.module.css */
.button {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  background: var(--color-primary);
}
```

## State Management

### Local UI State → `useState` / `useReducer`

- Dialog open/closed
- Form dirty state
- Active tab

### Server State → TanStack Query

- Project list
- Task list
- Mutations (create, update, delete)

### Global Preferences → Context + localStorage

- Theme
- Page size default
- Sidebar collapsed

## Error Handling Strategy

| Layer      | Approach                                               |
| ---------- | ------------------------------------------------------ |
| Storage    | `Result<T, E>` return types                            |
| Repository | Translate storage errors → domain errors               |
| Hooks      | Catch repository errors → toast notifications          |
| Components | Inline field errors (forms), global toasts (mutations) |
| Boundaries | React Error Boundary for render crashes                |

## Testing Architecture

### Unit Tests (`src/test/`, `src/domain/`, `src/infrastructure/`)

- Pure functions: domain calculations, validation, filtering
- Repository implementations with fake adapter
- No React dependencies

### Integration Tests (`src/features/*/`)

- Hooks with real repositories + fake storage
- Component rendering with React Testing Library
- User interactions via `@testing-library/user-event`

### E2E Tests (`e2e/`)

- Playwright against the Vite dev server (dev-only backlog seed)
- Critical user journeys
- Isolated storage per test

## Migration Strategy

### Storage Schema Versioning

```typescript
interface StorageSchema {
  version: number;
  projects: Record<ProjectId, StoredProject>;
  tasks: Record<TaskId, StoredTask>;
  epics: Record<EpicId, StoredEpic>;
  settings: UserSettings;
}
```

### Migration Function Signature

```typescript
type Migration = (data: unknown) => StorageSchema;
const migrations: Migration[] = [v1_to_v2, v2_to_v3];
```

## Security Considerations

- **No XSS**: All user content rendered as text, never `dangerouslySetInnerHTML`
- **Import Validation**: JSON import size limited (1MB), schema validated, no code execution
- **No Secrets**: No API keys, tokens, or credentials in client bundle
- **CSP**: Configure `Content-Security-Policy` headers on deploy

## Performance Considerations

- **Code Splitting**: Route-level `React.lazy` + `Suspense`
- **Memoization**: `React.memo` for list items, `useMemo` for derived computations
- **Virtualization**: Not needed initially (< 500 tasks), add if measured
- **Bundle Analysis**: `vite-bundle-analyzer` in CI

## Accessibility Architecture

- **Semantic HTML**: `<nav>`, `<main>`, `<section>`, `<article>`, `<dialog>`
- **ARIA**: Only where native semantics insufficient
- **Focus Management**: `useFocusTrap` hook for dialogs
- **Announcements**: `aria-live` region for toast/async updates
- **Tokens**: Focus ring, contrast ratios defined in design tokens

## Future Extensibility Points

| Feature     | Extension Point                                                      |
| ----------- | -------------------------------------------------------------------- |
| Backend API | Swap `LocalRepository` → `ApiRepository` implementing same interface |
| Real-time   | Add WebSocket listener → invalidate React Query cache                |
| Plugins     | Hook system in `useTasks` for custom filters/columns                 |
| Multi-user  | Add `userId` to domain types, filter at repository level             |
| Mobile App  | Share `domain/`, `infrastructure/repositories/` with React Native    |
