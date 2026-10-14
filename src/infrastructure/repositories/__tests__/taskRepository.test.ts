import { createStorageError } from '@/domain/errors';
import type { TaskInput, TaskUpdate } from '@/domain/task';
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

  describe('updateMany', () => {
    it('applies the same update to many tasks', async () => {
      const a = await repository.create({ ...validTaskInput, title: 'A' });
      const b = await repository.create({ ...validTaskInput, title: 'B' });
      if (!a.ok || !b.ok) return;

      const result = await repository.updateMany([a.value.id, b.value.id], { priority: 'high' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value.every((t) => t.priority === 'high')).toBe(true);
      }
    });

    it('returns an empty array when given no ids', async () => {
      const result = await repository.updateMany([], { status: 'done' });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([]);
    });

    it('rejects an invalid update', async () => {
      const result = await repository.updateMany(['any-id'], {
        priority: 'nope',
      } as unknown as TaskUpdate);
      expect(result.ok).toBe(false);
    });

    it('returns NOT_FOUND when any id is missing', async () => {
      const created = await repository.create(validTaskInput);
      if (!created.ok) return;

      const result = await repository.updateMany([created.value.id, 'missing'], {
        status: 'done',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.type).toBe('NOT_FOUND');
    });
  });

  describe('deleteMany', () => {
    it('soft-deletes many tasks', async () => {
      const a = await repository.create({ ...validTaskInput, title: 'A' });
      const b = await repository.create({ ...validTaskInput, title: 'B' });
      if (!a.ok || !b.ok) return;

      const result = await repository.deleteMany([a.value.id, b.value.id]);

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(2);

      const active = await repository.list();
      if (active.ok) expect(active.value).toHaveLength(0);
    });

    it('returns an error when a delete write fails mid-loop', async () => {
      const created = await repository.create(validTaskInput);
      if (!created.ok) return;

      adapter.setFailMode('set', createStorageError('PERMISSION_DENIED', 'write failed'));
      const result = await repository.deleteMany([created.value.id]);

      expect(result.ok).toBe(false);
    });
  });

  describe('restoreMany', () => {
    it('restores many tasks', async () => {
      const a = await repository.create({ ...validTaskInput, title: 'A' });
      const b = await repository.create({ ...validTaskInput, title: 'B' });
      if (!a.ok || !b.ok) return;
      await repository.deleteMany([a.value.id, b.value.id]);

      const result = await repository.restoreMany([a.value.id, b.value.id]);

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(2);

      const active = await repository.list();
      if (active.ok) expect(active.value).toHaveLength(2);
    });

    it('returns an error when restoring a missing task', async () => {
      const result = await repository.restoreMany(['missing']);
      expect(result.ok).toBe(false);
    });
  });

  describe('delete', () => {
    it('soft-deletes task (moves to trash)', async () => {
      const createResult = await repository.create(validTaskInput);
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const result = await repository.delete(createResult.value.id);

      expect(result.ok).toBe(true);

      const active = await repository.list();
      if (active.ok) expect(active.value).toHaveLength(0);

      const trashed = await repository.listDeleted();
      if (trashed.ok) {
        expect(trashed.value).toHaveLength(1);
        expect(trashed.value[0]?.deletedAt).toBeTruthy();
      }
    });

    it('restores a deleted task', async () => {
      const createResult = await repository.create(validTaskInput);
      if (!createResult.ok) return;

      await repository.delete(createResult.value.id);
      const restoreResult = await repository.restore(createResult.value.id);

      expect(restoreResult.ok).toBe(true);
      if (restoreResult.ok) expect(restoreResult.value.deletedAt).toBeUndefined();
    });

    it('purges a task permanently', async () => {
      const createResult = await repository.create(validTaskInput);
      if (!createResult.ok) return;

      await repository.delete(createResult.value.id);
      const purgeResult = await repository.purge(createResult.value.id);
      expect(purgeResult.ok).toBe(true);

      const getResult = await repository.get(createResult.value.id);
      expect(getResult.ok).toBe(false);
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

  describe('listDeleted', () => {
    it('returns only trashed tasks', async () => {
      const createResult = await repository.create(validTaskInput);
      if (!createResult.ok) return;

      await repository.delete(createResult.value.id);
      const result = await repository.listDeleted();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]?.id).toBe(createResult.value.id);
      }
    });
  });

  describe('restoreByProject', () => {
    it('restores all trashed tasks for a project', async () => {
      const projectId = '123e4567-e89b-12d3-a456-426614174001';
      await repository.create({ ...validTaskInput, projectId, title: 'Task 1' });
      await repository.create({ ...validTaskInput, projectId, title: 'Task 2' });

      await repository.deleteByProject(projectId);
      const deleted = await repository.list();
      if (deleted.ok) expect(deleted.value).toHaveLength(0);

      const result = await repository.restoreByProject(projectId);

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(2);

      const active = await repository.list();
      if (active.ok) expect(active.value).toHaveLength(2);
    });

    it('returns 0 when there is nothing to restore', async () => {
      const result = await repository.restoreByProject('non-existent');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(0);
    });
  });

  describe('purgeByProject', () => {
    it('permanently removes all tasks for a project', async () => {
      const projectId = '123e4567-e89b-12d3-a456-426614174001';
      const createResult = await repository.create({
        ...validTaskInput,
        projectId,
        title: 'Task 1',
      });
      if (!createResult.ok) return;

      const result = await repository.purgeByProject(projectId);

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(1);

      const getResult = await repository.get(createResult.value.id);
      expect(getResult.ok).toBe(false);
    });

    it('returns 0 for a project with no tasks', async () => {
      const result = await repository.purgeByProject('non-existent');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe(0);
    });
  });

  describe('error handling', () => {
    it('returns an error when a soft delete write fails', async () => {
      const createResult = await repository.create(validTaskInput);
      if (!createResult.ok) return;

      adapter.setFailMode('set', createStorageError('PERMISSION_DENIED', 'write failed'));
      const result = await repository.delete(createResult.value.id);

      expect(result.ok).toBe(false);
    });

    it('returns an error when restore read fails', async () => {
      adapter.setFailMode('get', createStorageError('PERMISSION_DENIED', 'read failed'));
      const result = await repository.restore('any-id');

      expect(result.ok).toBe(false);
    });

    it('returns an error when purge fails', async () => {
      adapter.setFailMode('delete', createStorageError('PERMISSION_DENIED', 'delete failed'));
      const result = await repository.purge('any-id');

      expect(result.ok).toBe(false);
    });

    it('propagates errors from listDeleted', async () => {
      adapter.setFailMode('getAll', createStorageError('PERMISSION_DENIED', 'read failed'));
      const result = await repository.listDeleted();

      expect(result.ok).toBe(false);
    });

    it('returns an error when restoreByProject fails mid-loop', async () => {
      const projectId = '123e4567-e89b-12d3-a456-426614174001';
      const createResult = await repository.create({ ...validTaskInput, projectId });
      if (!createResult.ok) return;
      await repository.delete(createResult.value.id);

      adapter.setFailMode('set', createStorageError('PERMISSION_DENIED', 'write failed'));
      const result = await repository.restoreByProject(projectId);

      expect(result.ok).toBe(false);
    });

    it('returns an error when purgeByProject fails mid-loop', async () => {
      const projectId = '123e4567-e89b-12d3-a456-426614174001';
      await repository.create({ ...validTaskInput, projectId });

      adapter.setFailMode('delete', createStorageError('PERMISSION_DENIED', 'delete failed'));
      const result = await repository.purgeByProject(projectId);

      expect(result.ok).toBe(false);
    });

    it('returns an error when deleteByProject fails mid-loop', async () => {
      const projectId = '123e4567-e89b-12d3-a456-426614174001';
      await repository.create({ ...validTaskInput, projectId });

      adapter.setFailMode('set', createStorageError('PERMISSION_DENIED', 'write failed'));
      const result = await repository.deleteByProject(projectId);

      expect(result.ok).toBe(false);
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

  describe('sub-tasks', () => {
    const otherProjectId = '123e4567-e89b-42d3-a456-4266141740ff';

    it('creates a sub-task that inherits its parent project', async () => {
      const parent = await repository.create(validTaskInput);
      if (!parent.ok) return;

      const result = await repository.create({
        ...validTaskInput,
        projectId: otherProjectId,
        title: 'Child',
        parentId: parent.value.id,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.parentId).toBe(parent.value.id);
        expect(result.value.projectId).toBe(validTaskInput.projectId);
      }
    });

    it('rejects a missing parent', async () => {
      const result = await repository.create({
        ...validTaskInput,
        parentId: '123e4567-e89b-42d3-a456-4266141740aa',
      });

      expect(result.ok).toBe(false);
      if (!result.ok && result.error.type === 'VALIDATION_ERROR') {
        expect(result.error.issues[0]?.code).toBe('parent_not_found');
      }
    });

    it('rejects nesting deeper than one level', async () => {
      const parent = await repository.create(validTaskInput);
      if (!parent.ok) return;
      const child = await repository.create({ ...validTaskInput, parentId: parent.value.id });
      if (!child.ok) return;

      const result = await repository.create({ ...validTaskInput, parentId: child.value.id });

      expect(result.ok).toBe(false);
      if (!result.ok && result.error.type === 'VALIDATION_ERROR') {
        expect(result.error.issues[0]?.code).toBe('parent_is_subtask');
      }
    });

    it('lists only active children of a parent', async () => {
      const parent = await repository.create(validTaskInput);
      if (!parent.ok) return;
      const child = await repository.create({ ...validTaskInput, parentId: parent.value.id });
      if (!child.ok) return;

      const beforeDelete = await repository.listChildren(parent.value.id);
      expect(beforeDelete.ok && beforeDelete.value).toHaveLength(1);

      await repository.delete(child.value.id);
      const afterDelete = await repository.listChildren(parent.value.id);
      expect(afterDelete.ok && afterDelete.value).toHaveLength(0);
    });

    it('cascades delete to sub-tasks', async () => {
      const parent = await repository.create(validTaskInput);
      if (!parent.ok) return;
      const child = await repository.create({ ...validTaskInput, parentId: parent.value.id });
      if (!child.ok) return;

      await repository.delete(parent.value.id);

      const active = await repository.list();
      expect(active.ok && active.value).toHaveLength(0);
      const trashed = await repository.listDeleted();
      expect(trashed.ok && trashed.value).toHaveLength(2);
    });

    it('restores sub-tasks along with their parent', async () => {
      const parent = await repository.create(validTaskInput);
      if (!parent.ok) return;
      const child = await repository.create({ ...validTaskInput, parentId: parent.value.id });
      if (!child.ok) return;

      await repository.delete(parent.value.id);
      const restoreResult = await repository.restore(parent.value.id);

      expect(restoreResult.ok).toBe(true);
      const active = await repository.list();
      expect(active.ok && active.value).toHaveLength(2);
      const trashed = await repository.listDeleted();
      expect(trashed.ok && trashed.value).toHaveLength(0);
    });

    it('rejects making a task its own parent', async () => {
      const task = await repository.create(validTaskInput);
      if (!task.ok) return;

      const result = await repository.update(task.value.id, { parentId: task.value.id });

      expect(result.ok).toBe(false);
      if (!result.ok && result.error.type === 'VALIDATION_ERROR') {
        expect(result.error.issues[0]?.code).toBe('parent_is_self');
      }
    });

    it('rejects re-parenting a task that has children', async () => {
      const parent = await repository.create(validTaskInput);
      if (!parent.ok) return;
      const child = await repository.create({ ...validTaskInput, parentId: parent.value.id });
      if (!child.ok) return;
      const other = await repository.create(validTaskInput);
      if (!other.ok) return;

      const result = await repository.update(parent.value.id, { parentId: other.value.id });

      expect(result.ok).toBe(false);
      if (!result.ok && result.error.type === 'VALIDATION_ERROR') {
        expect(result.error.issues[0]?.code).toBe('task_has_children');
      }
    });

    it('validates a new parent when updating', async () => {
      const task = await repository.create(validTaskInput);
      if (!task.ok) return;

      const result = await repository.update(task.value.id, {
        parentId: '123e4567-e89b-42d3-a456-4266141740bb',
      });

      expect(result.ok).toBe(false);
      if (!result.ok && result.error.type === 'VALIDATION_ERROR') {
        expect(result.error.issues[0]?.code).toBe('parent_not_found');
      }
    });

    it('moves a sub-task to another valid parent', async () => {
      const parentA = await repository.create(validTaskInput);
      const parentB = await repository.create(validTaskInput);
      if (!parentA.ok || !parentB.ok) return;
      const child = await repository.create({ ...validTaskInput, parentId: parentA.value.id });
      if (!child.ok) return;

      const result = await repository.update(child.value.id, { parentId: parentB.value.id });

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.parentId).toBe(parentB.value.id);
    });
  });
});
