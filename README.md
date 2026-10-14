# Workboard

A polished, responsive project and task management application demonstrating professional frontend engineering practices.

## Features

- **Project Management**: Create, edit, delete projects with color coding
- **Task Management**: Full CRUD for tasks with status, priority, due dates, assignees, tags
- **Kanban & List Views**: Switch between board and list layouts
- **Advanced Filtering**: Search, filter by status/priority/project/due date, multi-column sorting
- **Pagination**: Configurable page sizes with URL synchronization
- **Data Persistence**: IndexedDB (with localStorage fallback) - works offline
- **Import/Export**: JSON backup and restore with validation
- **Theme Support**: Light, dark, and system preference modes
- **Accessibility**: WCAG 2.2 AA compliant
- **Responsive Design**: Works on mobile, tablet, and desktop

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod
- **Storage**: IndexedDB via `idb` (localStorage fallback)
- **Testing**: Vitest (unit/integration), Playwright (E2E)
- **Linting**: ESLint + Prettier
- **Icons**: Lucide React
- **Styling**: CSS Modules with design tokens
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 24+ (pinned in `.nvmrc` — run `nvm use` if you use nvm)
- npm 10+

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/workboard.git
cd workboard

# Install dependencies (also installs Git hooks via the prepare script)
npm ci

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Available Scripts

| Command                  | Description                             |
| ------------------------ | --------------------------------------- |
| `npm run dev`            | Start development server                |
| `npm run build`          | Build for production                    |
| `npm run preview`        | Preview production build                |
| `npm run test`           | Run unit/integration tests (watch mode) |
| `npm run test:run`       | Run tests once                          |
| `npm run test:coverage`  | Run tests with coverage report          |
| `npm run test:e2e`       | Run Playwright E2E tests                |
| `npm run lint`           | Run ESLint                              |
| `npm run format`         | Format with Prettier                    |
| `npm run format:check`   | Check formatting                        |
| `npm run typecheck`      | TypeScript type check (app + tests)     |
| `npm run typecheck:test` | Type check the test project only        |
| `npm run ci`             | Run all CI checks locally               |

## Continuous Integration

- **CI** (`.github/workflows/ci.yml`): on every push to `main` and every PR it runs
  formatting, lint, typecheck, unit/integration tests with coverage, the production
  build, and Playwright E2E tests (Chromium). Reports are uploaded as artifacts.
- **Dependabot** (`.github/dependabot.yml`): weekly grouped npm and GitHub Actions
  update PRs.
- **Git hooks** (Husky + lint-staged): `pre-commit` runs ESLint and Prettier on staged
  files. Hooks are installed automatically by the `prepare` script.

### Local checks

Run the same suite CI runs:

```bash
npm run ci
```

To keep changes reviewable, prefer small commits; the pre-commit hook will format and
lint the files you stage.

## Project Structure

```
src/
├── app/                    # App shell, routing, providers
├── components/             # Shared UI components
│   ├── ui/                 # Base components (Button, Input, Select, Dialog)
│   ├── layout/             # Layout components (Layout, Sidebar, Header)
│   └── feedback/           # Feedback components (Toast, Alert, Loading, ErrorBoundary)
├── features/               # Feature modules
│   ├── dashboard/          # Dashboard page
│   ├── projects/           # Projects CRUD + detail
│   ├── tasks/              # Tasks CRUD + filtering
│   └── settings/           # Settings & data management
├── domain/                 # Domain types, validation, business logic
├── infrastructure/         # Storage & repository implementations
├── hooks/                  # Custom React hooks
├── lib/                    # Utility functions
└── styles/                 # Global styles & design tokens
```

## Architecture

See [Architecture Documentation](docs/architecture.md) for detailed architecture decisions.

### Key Principles

- **Layered Architecture**: UI → Hooks → Domain → Repositories → Storage
- **Repository Pattern**: Abstract storage behind interfaces
- **Type Safety**: Strict TypeScript, no `any`, runtime validation with Zod
- **Result Types**: Discriminated unions for error handling
- **Pure Domain Logic**: Business rules in testable pure functions

## Testing

### Unit, Component & Integration Tests

```bash
npm run test:run -- --coverage
```

Component and integration tests use React Testing Library (`src/**/__tests__`), and
unit tests cover the domain, repositories, storage adapters and utilities. Test files
are type-checked as a separate project (`tsconfig.test.json`).

Target coverage (enforced on `src/domain`, `src/infrastructure` and `src/lib`):

- Statements: ≥80%
- Branches: ≥75%
- Functions: ≥80%
- Lines: ≥80%

### E2E Tests

```bash
npm run build
npm run preview &
npm run test:e2e
```

Covers critical user journeys:

- First launch with demo data
- Project CRUD
- Task CRUD
- Filtering, sorting, pagination
- Data persistence
- Import/export
- Keyboard navigation

## Accessibility

WCAG 2.2 AA compliant with:

- Semantic HTML landmarks
- Full keyboard navigation
- Visible focus indicators
- Screen reader announcements
- Color contrast ratios
- Reduced motion support

## Performance

Production build targets:

- Lighthouse Performance: ≥90
- Lighthouse Accessibility: ≥95
- Lighthouse Best Practices: ≥95
- Lighthouse SEO: ≥90
- Bundle size: ≤100KB gzipped JS

## Data Storage

Data is stored locally in your browser:

- **Primary**: IndexedDB (via `idb`)
- **Fallback**: localStorage
- **No server**: Data never leaves your browser
- **No sync**: Not synchronized across devices
- **Export/Import**: Use JSON backup to transfer data

## Deployment

### Netlify (Recommended)

1. Connect repository to Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add redirect rule for SPA: `/* /index.html 200`

### Vercel

1. Import project
2. Framework preset: Vite
3. Output directory: `dist`

### Static Hosting (Any)

```bash
npm run build
# Deploy contents of dist/ folder
```

Ensure your host supports SPA fallback (redirect all routes to `index.html`).

## Known Limitations

- No real-time collaboration
- No backend/API (data is local only)
- No user authentication
- No file attachments
- No recurring tasks
- No task dependencies
- Limited to ~10,000 tasks before performance degrades

## Future Improvements

- Backend API with synchronization
- Real-time updates via WebSockets
- User accounts & teams
- File attachments
- Task dependencies & subtasks
- Calendar view
- Reporting & analytics
- Mobile app (React Native)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Run `npm run ci` locally
5. Submit a pull request

## Acknowledgments

- [Lucide](https://lucide.dev/) for icons
- [date-fns](https://date-fns.org/) for date handling
- [TanStack Query](https://tanstack.com/query) for server state
- [React Hook Form](https://react-hook-form.com/) for forms
- [Zod](https://zod.dev/) for validation
