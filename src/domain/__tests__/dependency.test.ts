import { describe, expect, it } from 'vitest';
import {
  collectBlockedTaskIds,
  getBlockingTasks,
  indexTasksById,
  isTaskBlocked,
  toTaskOptions,
  validateTaskBlockers,
  wouldCreateDependencyCycle,
} from '../dependency';
import type { Task } from '../task';

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

const index = (tasks: Task[]) => indexTasksById(tasks);

describe('isTaskBlocked', () => {
  it('is blocked while any blocker is still open', () => {
    const blocked = makeTask({ id: 'a', blockedBy: ['b'] });
    const blocker = makeTask({ id: 'b', status: 'in_progress' });
    expect(isTaskBlocked(blocked, index([blocked, blocker]))).toBe(true);
  });

  it('is unblocked once every blocker is done', () => {
    const blocked = makeTask({ id: 'a', blockedBy: ['b', 'c'] });
    const b = makeTask({ id: 'b', status: 'done' });
    const c = makeTask({ id: 'c', status: 'done' });
    expect(isTaskBlocked(blocked, index([blocked, b, c]))).toBe(false);
  });

  it('is never blocked when the task itself is done', () => {
    const done = makeTask({ id: 'a', status: 'done', blockedBy: ['b'] });
    const blocker = makeTask({ id: 'b', status: 'todo' });
    expect(isTaskBlocked(done, index([done, blocker]))).toBe(false);
  });

  it('is unblocked with no blockers', () => {
    const task = makeTask({ id: 'a' });
    expect(isTaskBlocked(task, index([task]))).toBe(false);
    expect(isTaskBlocked(makeTask({ id: 'a', blockedBy: [] }), index([]))).toBe(false);
  });

  it('ignores blockers that are missing or deleted', () => {
    const blocked = makeTask({ id: 'a', blockedBy: ['gone', 'trashed'] });
    const trashed = makeTask({
      id: 'trashed',
      status: 'todo',
      deletedAt: '2026-02-01T00:00:00.000Z',
    });
    expect(isTaskBlocked(blocked, index([blocked, trashed]))).toBe(false);
  });
});

describe('getBlockingTasks', () => {
  it('resolves only the active blockers', () => {
    const blocked = makeTask({ id: 'a', blockedBy: ['b', 'c', 'missing'] });
    const b = makeTask({ id: 'b' });
    const trashed = makeTask({ id: 'c', deletedAt: '2026-02-01T00:00:00.000Z' });
    expect(getBlockingTasks(blocked, index([blocked, b, trashed])).map((t) => t.id)).toEqual(['b']);
  });
});

describe('collectBlockedTaskIds', () => {
  it('derives the blocked ids in one pass', () => {
    const blocker = makeTask({ id: 'blocker', status: 'todo' });
    const blocked = makeTask({ id: 'blocked', blockedBy: ['blocker'] });
    const doneBlocked = makeTask({ id: 'doneBlocked', status: 'done', blockedBy: ['blocker'] });
    const orphan = makeTask({ id: 'orphan', blockedBy: ['missing'] });
    const free = makeTask({ id: 'free' });

    const ids = collectBlockedTaskIds([blocker, blocked, doneBlocked, orphan, free]);

    expect([...ids]).toEqual(['blocked']);
  });
});

describe('wouldCreateDependencyCycle', () => {
  it('rejects a self-reference', () => {
    expect(wouldCreateDependencyCycle('a', 'a', index([]))).toBe(true);
  });

  it('rejects a direct two-way dependency', () => {
    const a = makeTask({ id: 'a' });
    const b = makeTask({ id: 'b', blockedBy: ['a'] });
    // Adding a -> b would close a -> b -> a.
    expect(wouldCreateDependencyCycle('a', 'b', index([a, b]))).toBe(true);
  });

  it('rejects a transitive cycle', () => {
    const a = makeTask({ id: 'a' });
    const m = makeTask({ id: 'm', blockedBy: ['n'] });
    const n = makeTask({ id: 'n', blockedBy: ['a'] });
    expect(wouldCreateDependencyCycle('a', 'm', index([a, m, n]))).toBe(true);
  });

  it('allows an unrelated dependency', () => {
    const a = makeTask({ id: 'a' });
    const b = makeTask({ id: 'b' });
    expect(wouldCreateDependencyCycle('a', 'b', index([a, b]))).toBe(false);
  });
});

describe('validateTaskBlockers', () => {
  it('accepts a valid blocker list', () => {
    const a = makeTask({ id: 'a' });
    const b = makeTask({ id: 'b' });
    expect(validateTaskBlockers({ taskId: 'a', blockedBy: ['b'], tasksById: index([a, b]) })).toBe(
      null
    );
  });

  it('flags a self-dependency', () => {
    const a = makeTask({ id: 'a' });
    expect(validateTaskBlockers({ taskId: 'a', blockedBy: ['a'], tasksById: index([a]) })).toBe(
      'self_dependency'
    );
  });

  it('flags a missing blocker', () => {
    const a = makeTask({ id: 'a' });
    expect(validateTaskBlockers({ taskId: 'a', blockedBy: ['ghost'], tasksById: index([a]) })).toBe(
      'blocker_not_found'
    );
  });

  it('flags a deleted blocker', () => {
    const a = makeTask({ id: 'a' });
    const trashed = makeTask({ id: 'b', deletedAt: '2026-02-01T00:00:00.000Z' });
    expect(
      validateTaskBlockers({ taskId: 'a', blockedBy: ['b'], tasksById: index([a, trashed]) })
    ).toBe('blocker_not_found');
  });

  it('flags a cycle', () => {
    const a = makeTask({ id: 'a' });
    const b = makeTask({ id: 'b', blockedBy: ['a'] });
    expect(validateTaskBlockers({ taskId: 'a', blockedBy: ['b'], tasksById: index([a, b]) })).toBe(
      'cycle'
    );
  });

  it('ignores duplicate ids', () => {
    const a = makeTask({ id: 'a' });
    const b = makeTask({ id: 'b' });
    expect(
      validateTaskBlockers({ taskId: 'a', blockedBy: ['b', 'b'], tasksById: index([a, b]) })
    ).toBe(null);
  });
});

describe('toTaskOptions', () => {
  it('drops deleted tasks and normalises the blocker list', () => {
    const a = makeTask({ id: 'a', title: 'Alpha' });
    const b = makeTask({ id: 'b', title: 'Beta', blockedBy: ['a'] });
    const trashed = makeTask({ id: 'c', deletedAt: '2026-02-01T00:00:00.000Z' });

    expect(toTaskOptions([a, b, trashed])).toEqual([
      { id: 'a', title: 'Alpha', status: 'todo', blockedBy: [] },
      { id: 'b', title: 'Beta', status: 'todo', blockedBy: ['a'] },
    ]);
  });
});
