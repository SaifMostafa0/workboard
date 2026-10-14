# Handoff — Workboard

## Working state

- Branch: main (local)
- Commits:
  1. 457aec4 chore(quality): error reporting, bundle budget, axe a11y, contrast + select-name
  2. 9cd7161 feat(trash): soft delete with undo toast, Trash page, restore/purge
  3. 2cf2404 feat(command-palette): Cmd/Ctrl+K palette, keyboard shortcuts, help dialog
  4. 92da644 feat(tasks): bulk select to update status/priority or move tasks to trash
  5. 03e4705 feat(tasks): kanban drag-and-drop to move tasks between columns

## Quick wins implemented so far

1. Undo delete — done (toast actions in delete hooks)
2. Trash/soft delete — done (domain + repo + page + routes + hooks)
3. Command palette + shortcuts — done (keyboard + help + a11y tested)
4. Bulk actions (tasks) — done (select mode, bulk update/delete, undo)
5. Kanban DnD — done (HTML5 on desktop, fallbacks remain via buttons)

Remaining: #6 label manager, #7 saved views/filter presets. Also Storybook deferred as requested.

## Quality

- Lint: 0 errors (warnings allowed; jsx-a11y adjusted for DnD)
- Typecheck: pass
- Unit tests: 280 passed
- Coverage: ~89.58% stmts / 78.51% branches / 96.17% funcs / 95.05% lines
- Build: pass (gzip within budget)
- E2E: core suites pass (bulk, kanban-dnd chromium, trash/command-palette as previously)

## Notable changes

- `src/features/tasks/components/TaskCard.tsx` + CSS: selectable, draggable + drag props
- `src/features/projects/pages/ProjectDetailPage.tsx` + CSS: kanban DnD handlers + drop zone styling
- `src/features/tasks/pages/TasksPage.tsx` + CSS: bulk select mode
- `src/hooks/useData.ts`: `useBulkUpdateTasks`, `useBulkDeleteTasks`
- `src/infrastructure/repositories/taskRepository.ts`: `updateMany`, `deleteMany`, `restoreMany`
- `eslint.config.js`: relaxed `jsx-a11y/no-noninteractive-element-interactions` to allow DnD while preserving click/key warnings
- `e2e/kanban-dnd.spec.ts`: dispatches dragstart/dragover/drop/dragend (works with HTML5)

## How to resume

1. `npm run dev` to start
2. Next: #6 Label Manager (tags/labels CRUD, filter by label) or #7 Saved Views. Recommended #6 first.

## Known notes

- HTML5 DnD test uses event dispatch; mobile skipped.
- `@axe-core/playwright` installed; accessibility spec covers pages + palette + bulk area.
- Trash + undo already end-to-end covered.

You can safely shut down. When resuming, run `npm run lint && npx tsc --noEmit && npm run test` or just `npm run ci` if full.
