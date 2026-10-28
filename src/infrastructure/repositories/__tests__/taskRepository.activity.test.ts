import type { TaskInput } from '@/domain/task';
import { createActivityRepository } from '@/infrastructure/repositories/activityRepository';
import { createTaskRepository } from '@/infrastructure/repositories/taskRepository';
import { FakeStorageAdapter } from '@/test/factories/fakeStorageAdapter';
import { beforeEach, describe, expect, it } from 'vitest';

const PROJECT_ID = '123e4567-e89b-42d3-a456-426614174000';

describe('task activity history', () => {
  let adapter: FakeStorageAdapter;
  let tasks: ReturnType<typeof createTaskRepository>;
  let activity: ReturnType<typeof createActivityRepository>;

  beforeEach(() => {
    adapter = new FakeStorageAdapter();
    tasks = createTaskRepository(adapter);
    activity = createActivityRepository(adapter);
  });

  const input = (overrides: Partial<TaskInput> = {}): TaskInput => ({
    projectId: PROJECT_ID,
    title: 'Test Task',
    description: '',
    status: 'todo',
    priority: 'medium',
    tags: [],
    ...overrides,
  });

  const createTask = async (overrides: Partial<TaskInput> = {}) => {
    const result = await tasks.create(input(overrides));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('failed to create task');
    return result.value;
  };

  it('records creation', async () => {
    const task = await createTask();

    const entries = await activity.list(task.id);

    expect(entries.ok).toBe(true);
    if (entries.ok) {
      expect(entries.value).toHaveLength(1);
      expect(entries.value[0]?.kind).toBe('task_created');
    }
  });

  it('records one entry per changed tracked field', async () => {
    const task = await createTask();

    await tasks.update(task.id, { status: 'done', priority: 'urgent' });

    const entries = await activity.list(task.id);
    expect(entries.ok).toBe(true);
    if (entries.ok) {
      const changes = entries.value.filter((entry) => entry.kind === 'task_updated');
      expect(changes).toHaveLength(2);
      expect(changes.map((entry) => entry.field).sort()).toEqual(['priority', 'status']);
      expect(changes.find((entry) => entry.field === 'status')).toMatchObject({
        from: 'todo',
        to: 'done',
      });
    }
  });

  it('does not record updates that change nothing', async () => {
    const task = await createTask();

    await tasks.update(task.id, { title: task.title });

    const entries = await activity.list(task.id);
    expect(entries.ok).toBe(true);
    if (entries.ok) {
      expect(entries.value.filter((entry) => entry.kind === 'task_updated')).toEqual([]);
    }
  });

  it('removes activity when a task is purged', async () => {
    const task = await createTask();
    await tasks.delete(task.id);
    await tasks.purge(task.id);

    const entries = await activity.list(task.id);
    expect(entries.ok).toBe(true);
    if (entries.ok) expect(entries.value).toEqual([]);
    expect(adapter.getStoreSize()).toBe(0);
  });
});

describe('recurring tasks', () => {
  let adapter: FakeStorageAdapter;
  let tasks: ReturnType<typeof createTaskRepository>;
  let activity: ReturnType<typeof createActivityRepository>;

  beforeEach(() => {
    adapter = new FakeStorageAdapter();
    tasks = createTaskRepository(adapter);
    activity = createActivityRepository(adapter);
  });

  const input = (overrides: Partial<TaskInput> = {}): TaskInput => ({
    projectId: PROJECT_ID,
    title: 'Weekly review',
    description: '',
    status: 'todo',
    priority: 'medium',
    tags: [],
    dueDate: '2026-10-28',
    ...overrides,
  });

  it('stores a recurrence rule', async () => {
    const result = await tasks.create(
      input({ recurrence: { frequency: 'weekly', interval: 2, until: '2026-12-31' } })
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.recurrence).toEqual({
        frequency: 'weekly',
        interval: 2,
        until: '2026-12-31',
      });
    }
  });

  it('rejects a recurrence without a due date', async () => {
    const result = await tasks.create(
      input({ dueDate: undefined, recurrence: { frequency: 'daily', interval: 1 } })
    );

    expect(result.ok).toBe(false);
    if (!result.ok && result.error.type === 'VALIDATION_ERROR') {
      expect(result.error.issues?.[0]?.message).toMatch(/due date to anchor/i);
    }
  });

  it('rejects an end date before the due date', async () => {
    const result = await tasks.create(
      input({ recurrence: { frequency: 'daily', interval: 1, until: '2026-10-01' } })
    );

    expect(result.ok).toBe(false);
    if (!result.ok && result.error.type === 'VALIDATION_ERROR') {
      expect(result.error.issues?.[0]?.message).toMatch(/cannot be before the due date/i);
    }
  });

  it('schedules the next occurrence on completion and keeps the completed one', async () => {
    const created = await tasks.create(input({ recurrence: { frequency: 'daily', interval: 2 } }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const updated = await tasks.update(created.value.id, { status: 'done' });
    expect(updated.ok).toBe(true);

    const all = await tasks.list();
    expect(all.ok).toBe(true);
    if (!all.ok) return;

    const original = all.value.find((task) => task.id === created.value.id);
    const next = all.value.find((task) => task.id !== created.value.id);

    expect(original?.status).toBe('done');
    expect(next).toMatchObject({
      status: 'todo',
      dueDate: '2026-10-30',
      recurrence: { frequency: 'daily', interval: 2 },
      projectId: PROJECT_ID,
      title: 'Weekly review',
    });
    expect(next?.completedAt).toBeUndefined();

    const originalActivity = await activity.list(created.value.id);
    expect(originalActivity.ok).toBe(true);
    if (originalActivity.ok) {
      expect(originalActivity.value).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ kind: 'recurrence_scheduled', to: '2026-10-30' }),
        ])
      );
    }

    const nextActivity = await activity.list(next!.id);
    expect(nextActivity.ok).toBe(true);
    if (nextActivity.ok) {
      expect(nextActivity.value[0]?.kind).toBe('task_created');
    }
  });

  it('does not schedule a next occurrence for a non-recurring task', async () => {
    const created = await tasks.create(input({ dueDate: '2026-10-28' }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await tasks.update(created.value.id, { status: 'done' });

    const all = await tasks.list();
    expect(all.ok).toBe(true);
    if (all.ok) expect(all.value).toHaveLength(1);
  });

  it('stops the series when the next date is past the until date', async () => {
    const created = await tasks.create(
      input({
        recurrence: { frequency: 'daily', interval: 1, until: '2026-10-28' },
      })
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await tasks.update(created.value.id, { status: 'done' });

    const all = await tasks.list();
    expect(all.ok).toBe(true);
    if (all.ok) expect(all.value).toHaveLength(1);
  });

  it('stops future scheduling when the recurrence is cleared', async () => {
    const created = await tasks.create(input({ recurrence: { frequency: 'daily', interval: 1 } }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const cleared = await tasks.update(created.value.id, { recurrence: undefined });
    expect(cleared.ok).toBe(true);

    await tasks.update(created.value.id, { status: 'done' });

    const all = await tasks.list();
    expect(all.ok).toBe(true);
    if (all.ok) expect(all.value).toHaveLength(1);
  });

  it('does not duplicate the next occurrence when already done', async () => {
    const created = await tasks.create(input({ recurrence: { frequency: 'daily', interval: 1 } }));
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await tasks.update(created.value.id, { status: 'done' });
    await tasks.update(created.value.id, { status: 'done' });

    const all = await tasks.list();
    expect(all.ok).toBe(true);
    if (all.ok) expect(all.value).toHaveLength(2);
  });
});
