import { describe, expect, it } from 'vitest';
import type { Task } from '../task';
import {
  DEFAULT_TASK_PRIORITY,
  DEFAULT_TASK_STATUS,
  getSubtaskProgress,
  hasSubtaskProgress,
  isSubtask,
  isValidTaskPriority,
  isValidTaskStatus,
  MAX_SUBTASK_DEPTH,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_ORDER,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
  validateParentAssignment,
} from '../task';

describe('Task Domain', () => {
  describe('TASK_STATUSES', () => {
    it('contains all expected statuses', () => {
      expect(TASK_STATUSES).toEqual(['todo', 'in_progress', 'done']);
    });
  });

  describe('TASK_PRIORITIES', () => {
    it('contains all expected priorities', () => {
      expect(TASK_PRIORITIES).toEqual(['low', 'medium', 'high', 'urgent']);
    });
  });

  describe('TASK_STATUS_LABELS', () => {
    it('has correct labels for each status', () => {
      expect(TASK_STATUS_LABELS.todo).toBe('To Do');
      expect(TASK_STATUS_LABELS.in_progress).toBe('In Progress');
      expect(TASK_STATUS_LABELS.done).toBe('Done');
    });
  });

  describe('TASK_PRIORITY_LABELS', () => {
    it('has correct labels for each priority', () => {
      expect(TASK_PRIORITY_LABELS.low).toBe('Low');
      expect(TASK_PRIORITY_LABELS.medium).toBe('Medium');
      expect(TASK_PRIORITY_LABELS.high).toBe('High');
      expect(TASK_PRIORITY_LABELS.urgent).toBe('Urgent');
    });
  });

  describe('TASK_PRIORITY_ORDER', () => {
    it('has correct order values', () => {
      expect(TASK_PRIORITY_ORDER.low).toBe(0);
      expect(TASK_PRIORITY_ORDER.medium).toBe(1);
      expect(TASK_PRIORITY_ORDER.high).toBe(2);
      expect(TASK_PRIORITY_ORDER.urgent).toBe(3);
    });
  });

  describe('isValidTaskStatus', () => {
    it('returns true for valid statuses', () => {
      TASK_STATUSES.forEach((status) => {
        expect(isValidTaskStatus(status)).toBe(true);
      });
    });

    it('returns false for invalid statuses', () => {
      expect(isValidTaskStatus('invalid')).toBe(false);
      expect(isValidTaskStatus('')).toBe(false);
      expect(isValidTaskStatus('TODO')).toBe(false);
    });
  });

  describe('isValidTaskPriority', () => {
    it('returns true for valid priorities', () => {
      TASK_PRIORITIES.forEach((priority) => {
        expect(isValidTaskPriority(priority)).toBe(true);
      });
    });

    it('returns false for invalid priorities', () => {
      expect(isValidTaskPriority('invalid')).toBe(false);
      expect(isValidTaskPriority('')).toBe(false);
      expect(isValidTaskPriority('HIGH')).toBe(false);
    });
  });

  describe('DEFAULT_TASK_STATUS', () => {
    it('is a valid status', () => {
      expect(isValidTaskStatus(DEFAULT_TASK_STATUS)).toBe(true);
    });
  });

  describe('DEFAULT_TASK_PRIORITY', () => {
    it('is a valid priority', () => {
      expect(isValidTaskPriority(DEFAULT_TASK_PRIORITY)).toBe(true);
    });
  });

  describe('Task type structure', () => {
    it('has all required fields', () => {
      const task: Task = {
        id: 'test-id',
        projectId: 'project-id',
        title: 'Test Task',
        description: 'Description',
        status: 'todo',
        priority: 'medium',
        tags: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      expect(task.id).toBeDefined();
      expect(task.projectId).toBeDefined();
      expect(task.title).toBeDefined();
      expect(task.description).toBeDefined();
      expect(task.status).toBeDefined();
      expect(task.priority).toBeDefined();
      expect(task.tags).toBeDefined();
      expect(task.createdAt).toBeDefined();
      expect(task.updatedAt).toBeDefined();
    });

    it('has optional fields', () => {
      const task: Task = {
        id: 'test-id',
        projectId: 'project-id',
        title: 'Test Task',
        description: 'Description',
        status: 'todo',
        priority: 'medium',
        dueDate: '2024-12-31',
        assignee: 'John Doe',
        tags: ['tag1', 'tag2'],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        completedAt: '2024-01-15T00:00:00.000Z',
      };

      expect(task.dueDate).toBeDefined();
      expect(task.assignee).toBeDefined();
      expect(task.completedAt).toBeDefined();
    });
  });

  describe('Sub-tasks', () => {
    it('limits nesting to a single level', () => {
      expect(MAX_SUBTASK_DEPTH).toBe(1);
    });

    it('detects sub-tasks by parentId', () => {
      expect(isSubtask({ parentId: 'parent-1' })).toBe(true);
      expect(isSubtask({})).toBe(false);
      expect(isSubtask({ parentId: undefined })).toBe(false);
    });

    it('counts done children for progress', () => {
      expect(getSubtaskProgress([])).toEqual({ done: 0, total: 0 });
      expect(
        getSubtaskProgress([{ status: 'done' }, { status: 'todo' }, { status: 'done' }])
      ).toEqual({ done: 2, total: 3 });
    });

    it('reports whether there is progress to show', () => {
      expect(hasSubtaskProgress({ done: 0, total: 0 })).toBe(false);
      expect(hasSubtaskProgress({ done: 1, total: 2 })).toBe(true);
    });

    describe('validateParentAssignment', () => {
      it('accepts a valid top-level parent', () => {
        expect(
          validateParentAssignment({
            taskId: 'child',
            parentId: 'parent',
            parent: { id: 'parent' },
            taskHasChildren: false,
          })
        ).toBeNull();
      });

      it('rejects a task parenting itself', () => {
        expect(
          validateParentAssignment({
            taskId: 'parent',
            parentId: 'parent',
            parent: { id: 'parent' },
            taskHasChildren: false,
          })
        ).toBe('parent_is_self');
      });

      it('rejects a missing parent', () => {
        expect(
          validateParentAssignment({
            taskId: 'child',
            parentId: 'missing',
            parent: null,
            taskHasChildren: false,
          })
        ).toBe('parent_not_found');
      });

      it('rejects a parent that is itself a sub-task', () => {
        expect(
          validateParentAssignment({
            taskId: 'child',
            parentId: 'parent',
            parent: { id: 'parent', parentId: 'grandparent' },
            taskHasChildren: false,
          })
        ).toBe('parent_is_subtask');
      });

      it('rejects re-parenting a task that already has children', () => {
        expect(
          validateParentAssignment({
            taskId: 'child',
            parentId: 'parent',
            parent: { id: 'parent' },
            taskHasChildren: true,
          })
        ).toBe('task_has_children');
      });
    });
  });
});
