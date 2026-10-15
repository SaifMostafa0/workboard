import { DEFAULT_PAGE_SIZE, paginate, type Paged } from './pagination';
import type { Task, TaskPriority, TaskStatus } from './task';
import { TASK_PRIORITY_ORDER } from './task';

export { DEFAULT_PAGE_SIZE, paginate };
export type { Paged };

/** Fields a task list can be ordered by. */
export type TaskSortField = 'updatedAt' | 'createdAt' | 'dueDate' | 'priority' | 'title';
export type SortOrder = 'asc' | 'desc';

/** The due-date buckets offered by the Tasks page. `''` means "any date". */
export type DueFilter = '' | 'overdue' | 'today' | 'upcoming' | 'no-date';

/**
 * Everything needed to turn a set of tasks into the page a list view shows.
 * Plain data so it can live in the URL, a saved view, or a repository call.
 */
export interface TaskQuery {
  /** Free-text match against title, description and tags. */
  search?: string;
  status?: TaskStatus | '';
  priority?: TaskPriority | '';
  projectId?: string;
  epicId?: string;
  /** A task matches when it carries at least one of these tags. */
  tags?: string[];
  due?: DueFilter;
  /** Include sub-tasks (default: top-level tasks only). */
  includeSubtasks?: boolean;
  /** Include completed tasks (default: include them). */
  includeCompleted?: boolean;
  sortBy?: TaskSortField;
  sortOrder?: SortOrder;
  page?: number;
  pageSize?: number;
}

export const DEFAULT_TASK_SORT: TaskSortField = 'updatedAt';
export const DEFAULT_SORT_ORDER: SortOrder = 'desc';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Pure predicate behind the Tasks page: true when a task survives every
 * narrowing filter in the query. `now` is injected so due-date buckets are
 * deterministic in tests.
 */
export const matchesTaskQuery = (task: Task, query: TaskQuery, now: Date = new Date()): boolean => {
  // Sub-tasks are hidden from the top-level list unless explicitly included.
  if (!query.includeSubtasks && task.parentId) return false;

  if (query.includeCompleted === false && task.status === 'done') return false;

  if (query.search) {
    const needle = query.search.toLowerCase();
    const matches =
      task.title.toLowerCase().includes(needle) ||
      task.description.toLowerCase().includes(needle) ||
      task.tags.some((tag) => tag.toLowerCase().includes(needle));
    if (!matches) return false;
  }

  if (query.status && task.status !== query.status) return false;
  if (query.priority && task.priority !== query.priority) return false;
  if (query.projectId && task.projectId !== query.projectId) return false;
  if (query.epicId && task.epicId !== query.epicId) return false;

  const selectedTags = query.tags;
  if (
    selectedTags &&
    selectedTags.length > 0 &&
    !task.tags.some((tag) => selectedTags.includes(tag))
  ) {
    return false;
  }

  if (query.due) {
    const due = task.dueDate ? new Date(task.dueDate) : null;
    switch (query.due) {
      case 'overdue':
        if (!due || due >= now || task.status === 'done') return false;
        break;
      case 'today':
        if (!due || due.toDateString() !== now.toDateString()) return false;
        break;
      case 'upcoming': {
        const weekLater = new Date(now.getTime() + WEEK_MS);
        if (!due || due < now || due > weekLater || task.status === 'done') return false;
        break;
      }
      case 'no-date':
        if (due) return false;
        break;
    }
  }

  return true;
};

/** Everything in `tasks` that survives the query's narrowing filters. */
export const filterTasks = (tasks: Task[], query: TaskQuery = {}, now: Date = new Date()): Task[] =>
  tasks.filter((task) => matchesTaskQuery(task, query, now));

/** The comparable value a task sorts on, for the given field. */
const sortValue = (task: Task, sortBy: TaskSortField): number | string => {
  switch (sortBy) {
    case 'dueDate':
      // Missing due dates sort last (Infinity is handled by the comparator).
      return task.dueDate ? new Date(task.dueDate).getTime() : Infinity;
    case 'priority':
      return TASK_PRIORITY_ORDER[task.priority];
    case 'title':
      return task.title.toLowerCase();
    case 'createdAt':
      return new Date(task.createdAt).getTime();
    case 'updatedAt':
    default:
      return new Date(task.updatedAt).getTime();
  }
};

/** Stable, non-mutating sort. Tasks without a due date always come last. */
export const sortTasks = (
  tasks: Task[],
  sortBy: TaskSortField = DEFAULT_TASK_SORT,
  sortOrder: SortOrder = DEFAULT_SORT_ORDER
): Task[] =>
  [...tasks].sort((a, b) => {
    const aVal = sortValue(a, sortBy);
    const bVal = sortValue(b, sortBy);

    if (typeof aVal === 'string' || typeof bVal === 'string') {
      const asString = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'asc' ? asString : -asString;
    }

    if (aVal === Infinity && bVal === Infinity) return 0;
    if (aVal === Infinity) return 1;
    if (bVal === Infinity) return -1;

    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortOrder === 'asc' ? comparison : -comparison;
  });

/**
 * The whole list-view pipeline in one pure call: filter → sort → paginate.
 * Running it here (not in the component) keeps the page free of large arrays
 * and makes the behaviour trivially testable.
 */
export const queryTasks = (
  tasks: Task[],
  query: TaskQuery = {},
  now: Date = new Date()
): Paged<Task> =>
  paginate(
    sortTasks(filterTasks(tasks, query, now), query.sortBy, query.sortOrder),
    query.page,
    query.pageSize
  );

/** Distinct tags across a set of tasks, alphabetically. */
export const collectTags = (tasks: Task[]): string[] => {
  const tags = new Set<string>();
  for (const task of tasks) {
    for (const tag of task.tags) tags.add(tag);
  }
  return [...tags].sort((a, b) => a.localeCompare(b));
};

/** Done/total of each parent's direct sub-tasks, keyed by parent id. */
export const collectSubtaskProgress = (
  tasks: Task[]
): Map<string, { done: number; total: number }> => {
  const map = new Map<string, { done: number; total: number }>();
  for (const task of tasks) {
    if (!task.parentId) continue;
    const entry = map.get(task.parentId) ?? { done: 0, total: 0 };
    entry.total += 1;
    if (task.status === 'done') entry.done += 1;
    map.set(task.parentId, entry);
  }
  return map;
};

/** All the non-paged, whole-collection data a task list needs alongside its page. */
export interface TaskSummary {
  total: number;
  tags: string[];
  subtaskProgress: Map<string, { done: number; total: number }>;
}

/**
 * Derived data the list view needs but that must reflect *every* task, not just
 * the current page: the active-task count (for "filtered from N"), the tag
 * filter options, and sub-task progress badges. Computed in one pass so the
 * page only ever scans the collection once for it.
 */
export const collectTaskSummary = (tasks: Task[]): TaskSummary => ({
  total: tasks.length,
  tags: collectTags(tasks),
  subtaskProgress: collectSubtaskProgress(tasks),
});
