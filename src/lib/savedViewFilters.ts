import type { SavedView } from '@/domain/savedView';

/** The filter shape persisted on a {@link SavedView}. */
export type SavedViewFilters = SavedView['filters'];

/**
 * The Tasks-page filter state a saved view can capture. Kept as plain strings
 * (and an array of tags) so it maps cleanly to and from URL search params.
 */
export interface TaskFilterState {
  q: string;
  status: string;
  priority: string;
  project: string;
  due: string;
  tags: string[];
  epic?: string;
  sort: string;
  order: 'asc' | 'desc';
}

/** Mirrors the Tasks-page defaults (sort by updatedAt, newest first, no filters). */
export const DEFAULT_TASK_FILTERS: TaskFilterState = {
  q: '',
  status: '',
  priority: '',
  project: '',
  due: '',
  tags: [],
  epic: '',
  sort: 'updatedAt',
  order: 'desc',
};

/** Parses a comma-separated `tags` search param into a de-duplicated list. */
export function parseTagsParam(value: string | null | undefined): string[] {
  const tags = (value ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  return [...new Set(tags)];
}

/** Reads Tasks-page filter state out of the URL. */
export function searchParamsToTaskFilters(params: URLSearchParams): TaskFilterState {
  const order = params.get('order');
  return {
    q: params.get('q') ?? '',
    status: params.get('status') ?? '',
    priority: params.get('priority') ?? '',
    project: params.get('project') ?? '',
    due: params.get('due') ?? '',
    tags: parseTagsParam(params.get('tags')),
    epic: params.get('epic') ?? '',
    sort: params.get('sort') || DEFAULT_TASK_FILTERS.sort,
    order: order === 'asc' || order === 'desc' ? order : DEFAULT_TASK_FILTERS.order,
  };
}

/** Converts filter state back into URL search params, omitting defaults. */
export function taskFiltersToSearchParams(filters: TaskFilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.project) params.set('project', filters.project);
  if (filters.due) params.set('due', filters.due);
  if (filters.tags.length > 0) params.set('tags', filters.tags.join(','));
  if (filters.epic) params.set('epic', filters.epic);
  if (filters.sort && filters.sort !== DEFAULT_TASK_FILTERS.sort) params.set('sort', filters.sort);
  if (filters.order && filters.order !== DEFAULT_TASK_FILTERS.order)
    params.set('order', filters.order);
  return params;
}

/** Turns a stored view's filters into Tasks-page filter state. */
export function viewToTaskFilters(filters: SavedViewFilters | undefined): TaskFilterState {
  const view = filters ?? {};
  return {
    q: view.q ?? '',
    status: view.status ?? '',
    priority: view.priority ?? '',
    project: view.project ?? '',
    due: view.due ?? '',
    tags: view.tags ? [...view.tags] : [],
    epic: view.epic ?? '',
    sort: view.sort || DEFAULT_TASK_FILTERS.sort,
    order: view.order === 'asc' || view.order === 'desc' ? view.order : DEFAULT_TASK_FILTERS.order,
  };
}

/** Captures live Tasks-page filter state as a storable view, dropping defaults. */
export function taskFiltersToViewFilters(filters: TaskFilterState): SavedViewFilters {
  const view: SavedViewFilters = {};
  if (filters.q) view.q = filters.q;
  if (filters.status) view.status = filters.status;
  if (filters.priority) view.priority = filters.priority;
  if (filters.project) view.project = filters.project;
  if (filters.due) view.due = filters.due;
  if (filters.tags.length > 0) view.tags = [...filters.tags];
  if (filters.epic) view.epic = filters.epic;
  if (filters.sort && filters.sort !== DEFAULT_TASK_FILTERS.sort) view.sort = filters.sort;
  if (filters.order && filters.order !== DEFAULT_TASK_FILTERS.order) view.order = filters.order;
  return view;
}

/** True when any narrowing filter (not sort/order) is applied. */
export function hasActiveTaskFilters(filters: TaskFilterState): boolean {
  return Boolean(
    filters.q ||
    filters.status ||
    filters.priority ||
    filters.project ||
    filters.due ||
    filters.tags.length > 0 ||
    filters.epic
  );
}

/** Human-readable summary of a view's filters, for the saved-views list. */
export function describeViewFilters(
  filters: SavedViewFilters,
  projects: Array<{ id: string; name: string }> = []
): string {
  const parts: string[] = [];
  if (filters.q) parts.push(`Search “${filters.q}”`);
  if (filters.status) parts.push(`Status: ${filters.status}`);
  if (filters.priority) parts.push(`Priority: ${filters.priority}`);
  if (filters.project) {
    const name = projects.find((project) => project.id === filters.project)?.name;
    parts.push(`Project: ${name ?? 'selected'}`);
  }
  if (filters.due) parts.push(`Due: ${filters.due}`);
  if (filters.tags && filters.tags.length > 0) parts.push(`Tags: ${filters.tags.join(', ')}`);
  if (filters.epic) parts.push('Epic: selected');
  if (filters.sort && filters.sort !== DEFAULT_TASK_FILTERS.sort)
    parts.push(`Sort: ${filters.sort}`);
  if (filters.order && filters.order !== DEFAULT_TASK_FILTERS.order)
    parts.push(`Order: ${filters.order}`);
  return parts.length > 0 ? parts.join(' · ') : 'No filters';
}
