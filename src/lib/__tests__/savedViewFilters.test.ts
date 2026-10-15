import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TASK_FILTERS,
  describeViewFilters,
  hasActiveTaskFilters,
  parseTagsParam,
  searchParamsToTaskFilters,
  taskFiltersToSearchParams,
  taskFiltersToViewFilters,
  viewToTaskFilters,
  type TaskFilterState,
} from '../savedViewFilters';

const filters = (overrides: Partial<TaskFilterState> = {}): TaskFilterState => ({
  ...DEFAULT_TASK_FILTERS,
  ...overrides,
});

describe('savedViewFilters', () => {
  describe('parseTagsParam', () => {
    it('splits, trims, drops blanks and de-duplicates', () => {
      expect(parseTagsParam(' design, frontend ,, design ')).toEqual(['design', 'frontend']);
    });

    it('returns an empty array for null/undefined/empty input', () => {
      expect(parseTagsParam(null)).toEqual([]);
      expect(parseTagsParam(undefined)).toEqual([]);
      expect(parseTagsParam('')).toEqual([]);
    });
  });

  describe('searchParamsToTaskFilters', () => {
    it('reads every known param and applies defaults for the rest', () => {
      const params = new URLSearchParams(
        'q=hero&status=todo&priority=high&project=p1&due=overdue&tags=a,b&sort=dueDate&order=asc'
      );

      expect(searchParamsToTaskFilters(params)).toEqual({
        q: 'hero',
        status: 'todo',
        priority: 'high',
        project: 'p1',
        due: 'overdue',
        tags: ['a', 'b'],
        epic: '',
        sort: 'dueDate',
        order: 'asc',
      });
    });

    it('falls back to defaults when no params are present', () => {
      expect(searchParamsToTaskFilters(new URLSearchParams())).toEqual(DEFAULT_TASK_FILTERS);
    });

    it('ignores an invalid order value', () => {
      const params = new URLSearchParams('order=sideways');
      expect(searchParamsToTaskFilters(params).order).toBe('desc');
    });
  });

  describe('taskFiltersToSearchParams', () => {
    it('encodes filters and tags', () => {
      const params = taskFiltersToSearchParams(
        filters({
          q: 'hero',
          status: 'todo',
          priority: 'high',
          project: 'p1',
          due: 'today',
          tags: ['a', 'b'],
          sort: 'dueDate',
          order: 'asc',
        })
      );

      expect(params.get('q')).toBe('hero');
      expect(params.get('status')).toBe('todo');
      expect(params.get('priority')).toBe('high');
      expect(params.get('project')).toBe('p1');
      expect(params.get('due')).toBe('today');
      expect(params.get('tags')).toBe('a,b');
      expect(params.get('sort')).toBe('dueDate');
      expect(params.get('order')).toBe('asc');
    });

    it('omits default sort/order and empty filters', () => {
      const params = taskFiltersToSearchParams(filters());
      expect([...params.keys()]).toEqual([]);
    });
  });

  describe('round-trips', () => {
    it('URL params survive a round trip', () => {
      const original = filters({
        q: 'a b',
        status: 'in_progress',
        tags: ['x', 'y'],
        sort: 'priority',
        order: 'asc',
      });
      const roundTripped = searchParamsToTaskFilters(taskFiltersToSearchParams(original));
      expect(roundTripped).toEqual(original);
    });

    it('a stored view survives a round trip through live filter state', () => {
      const view = {
        q: 'copy',
        status: 'todo',
        project: 'p9',
        tags: ['marketing'],
        sort: 'title',
        order: 'asc' as const,
      };
      expect(taskFiltersToViewFilters(viewToTaskFilters(view))).toEqual(view);
    });
  });

  describe('view filters', () => {
    it('applies defaults when a view has no filters', () => {
      expect(viewToTaskFilters(undefined)).toEqual(DEFAULT_TASK_FILTERS);
      expect(viewToTaskFilters({})).toEqual(DEFAULT_TASK_FILTERS);
    });

    it('drops defaults when capturing a view', () => {
      expect(taskFiltersToViewFilters(filters())).toEqual({});
    });
  });

  describe('hasActiveTaskFilters', () => {
    it('is false for defaults and for sort-only changes', () => {
      expect(hasActiveTaskFilters(filters())).toBe(false);
      expect(hasActiveTaskFilters(filters({ sort: 'title', order: 'asc' }))).toBe(false);
    });

    it('is true when any narrowing filter is set', () => {
      expect(hasActiveTaskFilters(filters({ status: 'done' }))).toBe(true);
      expect(hasActiveTaskFilters(filters({ tags: ['design'] }))).toBe(true);
    });
  });

  describe('describeViewFilters', () => {
    it('describes an empty view', () => {
      expect(describeViewFilters({})).toBe('No filters');
    });

    it('summarises filters and resolves project names', () => {
      const summary = describeViewFilters(
        { q: 'hero', status: 'todo', project: 'p1', tags: ['design'], sort: 'title' },
        [{ id: 'p1', name: 'Website Redesign' }]
      );
      expect(summary).toContain('Search “hero”');
      expect(summary).toContain('Status: todo');
      expect(summary).toContain('Project: Website Redesign');
      expect(summary).toContain('Tags: design');
      expect(summary).toContain('Sort: title');
    });
  });
});
