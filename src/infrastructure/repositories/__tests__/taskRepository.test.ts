import type { TaskInput } from '@/domain/task';
import { createTaskRepository } from '@/infrastructure/repositories/taskRepository';
import { FakeStorageAdapter } from '@/test/factories/fakeStorageAdapter';
import { beforeEach, describe, expect, it } from 'vitest';

describe('LocalTaskRepository', () => {
  let adapter: FakeStorageAdapter;
  let repository: ReturnType<typeof createTaskRepository>;

  beforeEach(() => {
    adapter = new FakeStorageAdapter();
    repository = createTaskRepository(adapter);
  });

  const validTaskInput: TaskInput = {
    projectId: '123e4567-e89b-42d3-a456-426614174000',
    title: 'Test Task',
    description: 'Description',
    status: 'todo',
    priority: 'medium',
    tags: ['tag1', 'tag2'],
  };

  describe('create', () => {
    it('creates a task with generated ID and timestamps', async () => {
      const result = await repository.create(validTaskInput);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBeDefined();
        expect(result.value.title).toBe('Test Task');
        expect(result.value.status).toBe('todo');
        expect(result.value.priority).toBe('medium');
        expect(result.value.tags).toEqual(['tag1', 'tag2']);
        expect(result.value.createdAt).toBeDefined();
        expect(result.value.updatedAt).toBeDefined();
        expect(result.value.completedAt).toBeUndefined();
      }
    });

    it('sets completedAt when status is done', async () => {
      const result = await repository.create({ ...validTaskInput, status: 'done' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.completedAt).toBeDefined();
      }
    });

    it('does not set completedAt for other statuses', async () => {
      const result = await repository.create({ ...validTaskInput, status: 'in_progress' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.completedAt).toBeUndefined();
      }
    });

    it('rejects invalid input', async () => {
      const result = await repository.create({ ...validTaskInput, title: '' });
      expect(result.ok).toBe(false);
    });

    it('rejects invalid projectId', async () => {
      const result = await repository.create({ ...validTaskInput, projectId: 'invalid' });
      expect(result.ok).toBe(false);
    });
  });

  describe('get', () => {
    it('returns task by ID', async () => {
      const createResult = await repository.create(validTaskInput);
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const result = await repository.get(createResult.value.id);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe(createResult.value.id);
        expect(result.value.title).toBe('Test Task');
      }
    });

    it('returns NOT_FOUND for non-existent ID', async () => {
      const result = await repository.get('non-existent-id');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.type).toBe('NOT_FOUND');
    });
  });

  describe('list', () => {
    it('returns all tasks sorted by status, priority, due date, then creation date', async () => {
      // Create tasks in random order
      await repository.create({
        ...validTaskInput,
        title: 'Task 1',
        status: 'done',
        priority: 'low',
      });
      await repository.create({
        ...validTaskInput,
        title: 'Task 2',
        status: 'todo',
        priority: 'high',
      });
      await repository.create({
        ...validTaskInput,
        title: 'Task 3',
        status: 'todo',
        priority: 'urgent',
        dueDate: '2024-12-31',
      });
      await repository.create({
        ...validTaskInput,
        title: 'Task 4',
        status: 'in_progress',
        priority: 'medium',
      });
      await repository.create({
        ...validTaskInput,
        title: 'Task 5',
        status: 'todo',
        priority: 'urgent',
        dueDate: '2024-06-15',
      });

      const result = await repository.list();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(5);
        // Order: todo (urgent with earlier due date first), todo (urgent), todo (high), in_progress, done
        expect(result.value[0]?.title).toBe('Task 5'); // todo, urgent, due sooner
        expect(result.value[1]?.title).toBe('Task 3'); // todo, urgent, due later
        expect(result.value[2]?.title).toBe('Task 2'); // todo, high
        expect(result.value[3]?.title).toBe('Task 4'); // in_progress
        expect(result.value[4]?.title).toBe('Task 1'); // done
      }
    });

    it('filters by projectId', async () => {
      const projectId1 = '123e4567-e89b-42d3-a456-426614174001';
      const projectId2 = '123e4567-e89b-42d3-a456-426614174002';

      await repository.create({ ...validTaskInput, projectId: projectId1, title: 'Task 1' });
      await repository.create({ ...validTaskInput, projectId: projectId1, title: 'Task 2' });
      await repository.create({ ...validTaskInput, projectId: projectId2, title: 'Task 3' });

      const result = await repository.list(projectId1);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value.every((t) => t.projectId === projectId1)).toBe(true);
      }
    });
  });

  describe('update', () => {
    it('updates task fields', async () => {
      const createResult = await repository.create(validTaskInput);
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      // Small delay to ensure updatedAt changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await repository.update(createResult.value.id, {
        title: 'Updated Title',
        priority: 'high',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.title).toBe('Updated Title');
        expect(result.value.priority).toBe('high');
        expect(result.value.updatedAt).not.toBe(createResult.value.updatedAt);
      }
    });

    it('sets completedAt when status changes to done', async () => {
      const createResult = await repository.create({ ...validTaskInput, status: 'todo' });
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;
      expect(createResult.value.completedAt).toBeUndefined();

      const result = await repository.update(createResult.value.id, { status: 'done' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('done');
        expect(result.value.completedAt).toBeDefined();
      }
    });

    it('preserves completedAt when status stays done', async () => {
      const createResult = await repository.create({ ...validTaskInput, status: 'done' });
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;
      const originalCompletedAt = createResult.value.completedAt;

      const result = await repository.update(createResult.value.id, { title: 'Updated' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.completedAt).toBe(originalCompletedAt);
      }
    });

    it('clears completedAt when status changes from done to todo', async () => {
      const createResult = await repository.create({ ...validTaskInput, status: 'done' });
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const result = await repository.update(createResult.value.id, { status: 'todo' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('todo');
        expect(result.value.completedAt).toBeUndefined();
      }
    });

    it('returns NOT_FOUND for non-existent ID', async () => {
      const result = await repository.update('non-existent', { title: 'Test' });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.type).toBe('NOT_FOUND');
    });
  });

  describe('delete', () => {
    it('deletes task', async () => {
      const createResult = await repository.create(validTaskInput);
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const result = await repository.delete(createResult.value.id);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const getResult = await repository.get(createResult.value.id);
        expect(getResult.ok).toBe(false);
      }
    });
  });

  describe('deleteByProject', () => {
    it('deletes all tasks for a project', async () => {
      const projectId1 = '123e4567-e89b-12d3-a456-426614174001';
      const projectId2 = '123e4567-e89b-12d3-a456-426614174002';

      await repository.create({ ...validTaskInput, projectId: projectId1, title: 'Task 1' });
      await repository.create({ ...validTaskInput, projectId: projectId1, title: 'Task 2' });
      await repository.create({ ...validTaskInput, projectId: projectId2, title: 'Task 3' });

      const result = await repository.deleteByProject(projectId1);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(2);

        const remaining = await repository.list();
        expect(remaining.ok).toBe(true);
        if (remaining.ok) {
          expect(remaining.value).toHaveLength(1);
          expect(remaining.value[0]?.projectId).toBe(projectId2);
        }
      }
    });

    it('returns 0 for non-existent project', async () => {
      const result = await repository.deleteByProject('non-existent');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(0);
    });
  });

  describe('count', () => {
    it('returns total count', async () => {
      const empty = await repository.count();
      expect(empty.ok && empty.value).toBe(0);
      await repository.create(validTaskInput);
      const afterCreate = await repository.count();
      expect(afterCreate.ok && afterCreate.value).toBe(1);
    });

    it('returns count for project', async () => {
      const projectId = '123e4567-e89b-12d3-a456-426614174001';
      await repository.create({ ...validTaskInput, projectId });
      await repository.create({ ...validTaskInput, projectId });
      await repository.create(validTaskInput);

      const result = await repository.count(projectId);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(2);
    });
  });

  describe('countByStatus', () => {
    it('returns counts by status', async () => {
      const projectId = '123e4567-e89b-12d3-a456-426614174001';
      await repository.create({ ...validTaskInput, projectId, status: 'todo' });
      await repository.create({ ...validTaskInput, projectId, status: 'todo' });
      await repository.create({ ...validTaskInput, projectId, status: 'in_progress' });
      await repository.create({ ...validTaskInput, projectId, status: 'done' });

      const result = await repository.countByStatus(projectId);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.todo).toBe(2);
        expect(result.value.in_progress).toBe(1);
        expect(result.value.done).toBe(1);
      }
    });
  });
});
