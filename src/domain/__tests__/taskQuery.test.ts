import { describe, expect, it } from 'vitest';
import type { Task } from '../task';
import {
  collectSubtaskProgress,
  collectTags,
  collectTaskSummary,
  DEFAULT_PAGE_SIZE,
  filterTasks,
  matchesTaskQuery,
  paginate,
  queryTasks,
  sortTasks,
} from '../taskQuery';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 't1',
  projectId: 'p1',
  title: 'Task',
  description: '',
  status: 'todo',
  priority: 'medium',
  tags: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const NOW = new Date('2026-06-10T12:00:00.000Z');

describe('matchesTaskQuery / filterTasks', () => {
  it('keeps top-level tasks and hides sub-tasks by default', () => {
    const parent = makeTask({ id: 'parent' });
    const child = makeTask({ id: 'child', parentId: 'parent' });
    expect(filterTasks([parent, child]).map((t) => t.id)).toEqual(['parent']);
  });

  it('includes sub-tasks when asked', () => {
    const parent = makeTask({ id: 'parent' });
    const child = makeTask({ id: 'child', parentId: 'parent' });
    expect(filterTasks([parent, child], { includeSubtasks: true })).toHaveLength(2);
  });

  it('drops completed tasks when includeCompleted is false', () => {
    const open = makeTask({ id: 'open' });
    const done = makeTask({ id: 'done', status: 'done' });
    expect(filterTasks([open, done], { includeCompleted: false }).map((t) => t.id)).toEqual([
      'open',
    ]);
  });

  it('matches search against title, description and tags (case-insensitively)', () => {
    const tasks = [
      makeTask({ id: 'title', title: 'Fix login bug' }),
      makeTask({ id: 'desc', description: 'Touches the LOGIN flow' }),
      makeTask({ id: 'tag', tags: ['login'] }),
      makeTask({ id: 'none', title: 'Unrelated' }),
    ];
    expect(filterTasks(tasks, { search: 'login' }).map((t) => t.id)).toEqual([
      'title',
      'desc',
      'tag',
    ]);
  });

  it('filters by status, priority, project and epic', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'in_progress', priority: 'high', projectId: 'p1', epicId: 'e1' }),
      makeTask({ id: 'b', status: 'todo', priority: 'low', projectId: 'p2' }),
    ];
    expect(filterTasks(tasks, { status: 'todo' }).map((t) => t.id)).toEqual(['b']);
    expect(filterTasks(tasks, { priority: 'high' }).map((t) => t.id)).toEqual(['a']);
    expect(filterTasks(tasks, { projectId: 'p1' }).map((t) => t.id)).toEqual(['a']);
    expect(filterTasks(tasks, { epicId: 'e1' }).map((t) => t.id)).toEqual(['a']);
  });

  it('matches a task when it carries any of the selected tags', () => {
    const tasks = [makeTask({ id: 'a', tags: ['x', 'y'] }), makeTask({ id: 'b', tags: ['z'] })];
    expect(filterTasks(tasks, { tags: ['y', 'z'] }).map((t) => t.id)).toEqual(['a', 'b']);
    expect(filterTasks(tasks, { tags: ['nope'] })).toHaveLength(0);
  });

  describe('due-date buckets', () => {
    const tasks = [
      makeTask({ id: 'overdue', dueDate: '2026-06-01', status: 'in_progress' }),
      makeTask({ id: 'done-overdue', dueDate: '2026-06-01', status: 'done' }),
      makeTask({ id: 'today', dueDate: '2026-06-10' }),
      makeTask({ id: 'soon', dueDate: '2026-06-14' }),
      makeTask({ id: 'far', dueDate: '2026-07-01' }),
      makeTask({ id: 'none' }),
    ];

    it('overdue excludes done tasks and future dates', () => {
      // 'today' (2026-06-10T00:00Z) is earlier than the injected NOW (12:00Z), so it is
      // overdue too — this mirrors the original Tasks-page comparison.
      expect(filterTasks(tasks, { due: 'overdue' }, NOW).map((t) => t.id)).toEqual([
        'overdue',
        'today',
      ]);
    });

    it('today matches the calendar day only', () => {
      expect(filterTasks(tasks, { due: 'today' }, NOW).map((t) => t.id)).toEqual(['today']);
    });

    it('upcoming matches the next seven days, excluding past and done', () => {
      expect(filterTasks(tasks, { due: 'upcoming' }, NOW).map((t) => t.id)).toEqual(['soon']);
    });

    it('no-date matches tasks without a due date', () => {
      expect(filterTasks(tasks, { due: 'no-date' }, NOW).map((t) => t.id)).toEqual(['none']);
    });

    it("an empty bucket ('') applies no date filter", () => {
      expect(filterTasks(tasks, { due: '' }, NOW)).toHaveLength(tasks.length);
    });
  });

  it('ignores empty filters', () => {
    const task = makeTask();
    expect(
      matchesTaskQuery(task, { search: '', status: '', priority: '', projectId: '', due: '' }, NOW)
    ).toBe(true);
  });
});

describe('sortTasks', () => {
  const tasks = [
    makeTask({ id: 'old', updatedAt: '2026-01-01T00:00:00.000Z', priority: 'low', title: 'Beta' }),
    makeTask({
      id: 'new',
      updatedAt: '2026-03-01T00:00:00.000Z',
      priority: 'urgent',
      title: 'alpha',
    }),
    makeTask({
      id: 'mid',
      updatedAt: '2026-02-01T00:00:00.000Z',
      priority: 'high',
      title: 'Gamma',
    }),
  ];

  it('sorts by updatedAt descending by default without mutating the input', () => {
    const input = [...tasks];
    expect(sortTasks(tasks).map((t) => t.id)).toEqual(['new', 'mid', 'old']);
    expect(tasks).toEqual(input);
  });

  it('honours ascending order', () => {
    expect(sortTasks(tasks, 'updatedAt', 'asc').map((t) => t.id)).toEqual(['old', 'mid', 'new']);
  });

  it('sorts by priority and title', () => {
    expect(sortTasks(tasks, 'priority', 'desc').map((t) => t.id)).toEqual(['new', 'mid', 'old']);
    expect(sortTasks(tasks, 'title', 'asc').map((t) => t.title)).toEqual([
      'alpha',
      'Beta',
      'Gamma',
    ]);
  });

  it('sorts tasks without a due date last in both directions', () => {
    const dated = [
      makeTask({ id: 'later', dueDate: '2026-05-01' }),
      makeTask({ id: 'none' }),
      makeTask({ id: 'sooner', dueDate: '2026-03-01' }),
    ];
    expect(sortTasks(dated, 'dueDate', 'asc').map((t) => t.id)).toEqual([
      'sooner',
      'later',
      'none',
    ]);
    expect(sortTasks(dated, 'dueDate', 'desc').map((t) => t.id)).toEqual([
      'later',
      'sooner',
      'none',
    ]);
  });
});

describe('paginate', () => {
  const items = Array.from({ length: 45 }, (_, i) => i);

  it('returns the requested slice with totals', () => {
    const page = paginate(items, 2, 20);
    expect(page).toEqual({
      items: items.slice(20, 40),
      total: 45,
      page: 2,
      pageSize: 20,
      totalPages: 3,
    });
  });

  it('clamps out-of-range and invalid pages into range', () => {
    expect(paginate(items, 99, 20).page).toBe(3);
    expect(paginate(items, 0, 20).page).toBe(1);
    expect(paginate(items, 2.7, 20).page).toBe(2);
    expect(paginate(items, Number.NaN, 20).page).toBe(1);
    expect(paginate(items, -4, 20).page).toBe(1);
  });

  it('uses sensible defaults and handles empty lists', () => {
    const page = paginate(items);
    expect(page.pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(page.page).toBe(1);
    expect(paginate([])).toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      totalPages: 1,
    });
  });
});

describe('queryTasks', () => {
  it('runs filter, sort and paginate in one pass', () => {
    const tasks = Array.from({ length: 30 }, (_, i) =>
      makeTask({
        id: `t${i}`,
        title: `Task ${i}`,
        status: i % 2 === 0 ? 'done' : 'todo',
        updatedAt: `2026-01-${String((i % 28) + 1).padStart(2, '0')}T00:00:00.000Z`,
      })
    );

    const page = queryTasks(tasks, {
      status: 'todo',
      page: 2,
      pageSize: 5,
      sortBy: 'title',
      sortOrder: 'asc',
    });
    expect(page.total).toBe(15);
    expect(page.totalPages).toBe(3);
    expect(page.page).toBe(2);
    expect(page.items).toHaveLength(5);
  });
});

describe('collectTags', () => {
  it('returns unique tags, sorted alphabetically', () => {
    const tasks = [
      makeTask({ tags: ['zeta', 'alpha'] }),
      makeTask({ tags: ['alpha', 'beta'] }),
      makeTask({}),
    ];
    expect(collectTags(tasks)).toEqual(['alpha', 'beta', 'zeta']);
  });
});

describe('collectSubtaskProgress', () => {
  it('counts done/total of direct children per parent', () => {
    const tasks = [
      makeTask({ id: 'a', parentId: 'parent' }),
      makeTask({ id: 'b', parentId: 'parent', status: 'done' }),
      makeTask({ id: 'c' }),
    ];
    const progress = collectSubtaskProgress(tasks);
    expect(progress.get('parent')).toEqual({ done: 1, total: 2 });
    expect(progress.has('c')).toBe(false);
  });
});

describe('collectTaskSummary', () => {
  it('bundles the total, tags and sub-task progress in one pass', () => {
    const tasks = [
      makeTask({ id: 'a', tags: ['x'], parentId: 'p' }),
      makeTask({ id: 'b', tags: ['y'], parentId: 'p', status: 'done' }),
    ];
    const summary = collectTaskSummary(tasks);
    expect(summary.total).toBe(2);
    expect(summary.tags).toEqual(['x', 'y']);
    expect(summary.subtaskProgress.get('p')).toEqual({ done: 1, total: 2 });
  });
});

describe('blocked filter', () => {
  it('keeps only blocked tasks when blocked is true', () => {
    const blocker = makeTask({ id: 'blocker', status: 'todo' });
    const blocked = makeTask({ id: 'blocked', blockedBy: ['blocker'] });
    const free = makeTask({ id: 'free' });
    expect(filterTasks([blocker, blocked, free], { blocked: true }).map((t) => t.id)).toEqual([
      'blocked',
    ]);
  });

  it('keeps only unblocked tasks when blocked is false', () => {
    const blocker = makeTask({ id: 'blocker', status: 'todo' });
    const blocked = makeTask({ id: 'blocked', blockedBy: ['blocker'] });
    const free = makeTask({ id: 'free' });
    expect(filterTasks([blocker, blocked, free], { blocked: false }).map((t) => t.id)).toEqual([
      'blocker',
      'free',
    ]);
  });

  it('treats a task as unblocked once its blockers are done', () => {
    const blocker = makeTask({ id: 'blocker', status: 'done' });
    const blocked = makeTask({ id: 'blocked', blockedBy: ['blocker'] });
    expect(filterTasks([blocker, blocked], { blocked: true })).toEqual([]);
  });
});

describe('collectTaskSummary blocked state', () => {
  it('bundles the blocked ids and the blocker-picker options', () => {
    const blocker = makeTask({ id: 'blocker', status: 'todo' });
    const blocked = makeTask({ id: 'blocked', blockedBy: ['blocker'] });
    const summary = collectTaskSummary([blocker, blocked]);
    expect([...summary.blockedTaskIds]).toEqual(['blocked']);
    expect(summary.options.map((option) => option.id)).toEqual(['blocker', 'blocked']);
  });
});
