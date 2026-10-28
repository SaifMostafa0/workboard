import { createStorageError } from '@/domain/errors';
import { createFakeAdapter } from '@/test/factories/fakeStorageAdapter';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  appendTaskActivity,
  clearTaskActivities,
  createTaskActivity,
  LocalTaskActivityRepository,
} from '../activityRepository';

const TASK_ID = '123e4567-e89b-42d3-a456-426614174000';
const OTHER_TASK_ID = '123e4567-e89b-42d3-a456-426614174001';
const ACTIVITY_ID = '123e4567-e89b-42d3-a456-426614174002';

describe('LocalTaskActivityRepository', () => {
  let adapter: ReturnType<typeof createFakeAdapter>;
  let repo: LocalTaskActivityRepository;

  beforeEach(() => {
    adapter = createFakeAdapter();
    repo = new LocalTaskActivityRepository(adapter);
  });

  describe('add', () => {
    it('persists a valid activity entry', async () => {
      const activity = createTaskActivity({
        taskId: TASK_ID,
        kind: 'task_created',
        now: '2026-10-28T10:00:00.000Z',
      });

      const result = await repo.add(activity);

      expect(result.ok).toBe(true);
      expect(adapter.getValue(`workboard:activity:${TASK_ID}:${activity.id}`)).toBeTruthy();
    });

    it('rejects invalid activity entries', async () => {
      const activity = {
        ...createTaskActivity({ taskId: TASK_ID, kind: 'task_created' }),
        taskId: 'not-a-uuid',
      };

      const result = await repo.add(activity);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.type).toBe('VALIDATION_ERROR');
      expect(adapter.getStoreSize()).toBe(0);
    });

    it('propagates storage failures', async () => {
      adapter.setFailMode('set', createStorageError('QUOTA_EXCEEDED', 'Full'));

      const result = await repo.add(createTaskActivity({ taskId: TASK_ID, kind: 'task_created' }));

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.type).toBe('QUOTA_EXCEEDED');
    });
  });

  describe('comment', () => {
    it('trims and stores a comment', async () => {
      const result = await repo.comment(TASK_ID, '  Looks good  ', 'You');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.kind).toBe('comment');
        expect(result.value.message).toBe('Looks good');
        expect(result.value.authorName).toBe('You');
      }
    });

    it('rejects an empty comment', async () => {
      const result = await repo.comment(TASK_ID, '   ');

      expect(result.ok).toBe(false);
      if (!result.ok && result.error.type === 'VALIDATION_ERROR') {
        expect(result.error.issues?.[0]?.message).toMatch(/cannot be empty/i);
      }
    });

    it('rejects comments over 2000 characters', async () => {
      const result = await repo.comment(TASK_ID, 'a'.repeat(2001));

      expect(result.ok).toBe(false);
      if (!result.ok && result.error.type === 'VALIDATION_ERROR') {
        expect(result.error.issues?.[0]?.message).toMatch(/2000 characters or less/i);
      }
    });
  });

  describe('list', () => {
    it('returns an empty list when nothing is stored', async () => {
      const result = await repo.list(TASK_ID);

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([]);
    });

    it('sorts entries by creation time', async () => {
      await repo.add({
        id: '123e4567-e89b-42d3-a456-426614174010',
        taskId: TASK_ID,
        kind: 'task_updated',
        field: 'status',
        createdAt: '2026-10-28T12:00:00.000Z',
      });
      await repo.add({
        id: '123e4567-e89b-42d3-a456-426614174011',
        taskId: TASK_ID,
        kind: 'task_created',
        createdAt: '2026-10-28T10:00:00.000Z',
      });

      const result = await repo.list(TASK_ID);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.map((entry) => entry.kind)).toEqual(['task_created', 'task_updated']);
      }
    });

    it('ignores malformed entries and entries for other tasks', async () => {
      await adapter.set(`workboard:activity:${TASK_ID}:${ACTIVITY_ID}`, {
        id: ACTIVITY_ID,
        taskId: TASK_ID,
        kind: 'not-a-kind',
        createdAt: '2026-10-28T10:00:00.000Z',
      });
      await adapter.set(
        `workboard:activity:${OTHER_TASK_ID}:${ACTIVITY_ID}`,
        createTaskActivity({ taskId: OTHER_TASK_ID, kind: 'task_created' })
      );

      const result = await repo.list(TASK_ID);

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([]);
    });
  });

  describe('clearForTask', () => {
    it('removes only the given task’s activity', async () => {
      await repo.add(createTaskActivity({ taskId: TASK_ID, kind: 'task_created' }));
      await repo.add(createTaskActivity({ taskId: OTHER_TASK_ID, kind: 'task_created' }));

      const result = await repo.clearForTask(TASK_ID);

      expect(result.ok).toBe(true);
      expect(adapter.getStoreSize()).toBe(1);
    });
  });
});

describe('appendTaskActivity', () => {
  it('appends a valid activity entry to any adapter', async () => {
    const adapter = createFakeAdapter();
    const activity = createTaskActivity({ taskId: TASK_ID, kind: 'task_imported' });

    const result = await appendTaskActivity(adapter, activity);

    expect(result.ok).toBe(true);
    expect(adapter.getStoreSize()).toBe(1);
  });

  it('rejects invalid entries', async () => {
    const adapter = createFakeAdapter();

    const result = await appendTaskActivity(adapter, {
      ...createTaskActivity({ taskId: TASK_ID, kind: 'comment', message: 'x'.repeat(2001) }),
      id: 'not-a-uuid',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.type).toBe('VALIDATION_ERROR');
  });
});

describe('clearTaskActivities', () => {
  it('clears all activity for a task', async () => {
    const adapter = createFakeAdapter();
    await appendTaskActivity(
      adapter,
      createTaskActivity({ taskId: TASK_ID, kind: 'task_created' })
    );

    const result = await clearTaskActivities(adapter, TASK_ID);

    expect(result.ok).toBe(true);
    expect(adapter.getStoreSize()).toBe(0);
  });
});
