import { describe, it } from 'vitest';
import type { Task, TaskPriority, TaskStatus } from '../task';
import { queryTasks } from '../taskQuery';

/**
 * Repeatable benchmark for the task list pipeline (see `docs/performance.md`).
 *
 * Run with `npm run bench`. The numbers are only meaningful relative to each
 * other on the same machine; they exist to show how the pure filter → sort →
 * paginate step scales as the collection grows.
 */

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done'];
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
const TAG_POOL = ['bug', 'frontend', 'backend', 'design', 'docs', 'urgent', 'login'];

const makeTasks = (count: number): Task[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `task-${index}`,
    projectId: `project-${index % 25}`,
    title: `Task ${index} fix the ${index % 3 === 0 ? 'login' : 'dashboard'} bug`,
    description: index % 5 === 0 ? 'Touches the authentication flow' : '',
    status: STATUSES[index % STATUSES.length]!,
    priority: PRIORITIES[index % PRIORITIES.length]!,
    dueDate: index % 4 === 0 ? '2026-06-10' : undefined,
    tags: [TAG_POOL[index % TAG_POOL.length]!],
    createdAt: new Date(Date.UTC(2026, 0, 1) + index * 60_000).toISOString(),
    updatedAt: new Date(Date.UTC(2026, 5, 1) + index * 60_000).toISOString(),
    // Every 10th task is a sub-task, so the default query filters them out.
    parentId: index % 10 === 0 ? `task-${Math.max(0, index - 1)}` : undefined,
  }));

const NOW = new Date('2026-06-10T12:00:00.000Z');

const FILTERED_QUERY = {
  search: 'login',
  status: 'todo' as const,
  sortBy: 'priority' as const,
  sortOrder: 'desc' as const,
  page: 1,
  pageSize: 50,
};

for (const size of [1_000, 10_000, 50_000]) {
  const tasks = makeTasks(size);

  describe(`queryTasks with ${size.toLocaleString()} tasks`, () => {
    it('default query (top-level, sorted by updatedAt)', async ({ bench }) => {
      await bench('default', () => queryTasks(tasks, {}, NOW)).run();
    });

    it('filtered query (search + status + priority sort)', async ({ bench }) => {
      await bench('filtered', () => queryTasks(tasks, FILTERED_QUERY, NOW)).run();
    });
  });
}
