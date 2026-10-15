import type {
  Epic,
  ParentAssignmentIssue,
  Task,
  TaskInput,
  TaskPriority,
  TaskStatus,
  TaskUpdate,
} from '@/domain';
import type { DomainError, StorageError, ValidationError } from '@/domain/errors';
import { createNotFoundError, createValidationError } from '@/domain/errors';
import { PARENT_ASSIGNMENT_MESSAGES, validateParentAssignment } from '@/domain/task';
import {
  safeValidateTaskInput,
  safeValidateTaskUpdate,
  zodErrorToValidationError,
} from '@/domain/validation';
import type { Result, StorageAdapter } from '@/infrastructure/storage/storageAdapter';
import {
  createCollectionPrefix,
  createStorageKey,
  err,
  ok,
} from '@/infrastructure/storage/storageAdapter';

export interface ITaskRepository {
  list(projectId?: string): Promise<Result<Task[], DomainError>>;
  listDeleted(): Promise<Result<Task[], DomainError>>;
  /** Active children of a parent task. */
  listChildren(parentId: string): Promise<Result<Task[], DomainError>>;
  get(id: string): Promise<Result<Task, DomainError>>;
  create(input: TaskInput): Promise<Result<Task, DomainError>>;
  update(id: string, update: TaskUpdate): Promise<Result<Task, DomainError>>;
  /** Apply the same update to many tasks, returning the updated records. */
  updateMany(ids: string[], update: TaskUpdate): Promise<Result<Task[], DomainError>>;
  /** Soft-delete: stamps `deletedAt` so the task can be restored. */
  delete(id: string): Promise<Result<void, DomainError>>;
  /** Soft-delete many tasks, returning how many were moved to trash. */
  deleteMany(ids: string[]): Promise<Result<number, DomainError>>;
  restore(id: string): Promise<Result<Task, DomainError>>;
  /** Restore many trashed tasks, returning how many were restored. */
  restoreMany(ids: string[]): Promise<Result<number, DomainError>>;
  /** Hard-delete: removes the record permanently. */
  purge(id: string): Promise<Result<void, DomainError>>;
  deleteByProject(projectId: string): Promise<Result<number, DomainError>>;
  restoreByProject(projectId: string): Promise<Result<number, DomainError>>;
  purgeByProject(projectId: string): Promise<Result<number, DomainError>>;
  count(projectId?: string): Promise<Result<number, DomainError>>;
  countByStatus(projectId: string): Promise<Result<Record<TaskStatus, number>, DomainError>>;
}

const TASK_PREFIX = createCollectionPrefix('tasks');
const EPIC_PREFIX = createCollectionPrefix('epics');

const toDomainError = (error: StorageError): DomainError => error;

const parentIssueError = (issue: ParentAssignmentIssue): ValidationError =>
  createValidationError([
    { field: 'parentId', message: PARENT_ASSIGNMENT_MESSAGES[issue], code: issue },
  ]);

export class LocalTaskRepository implements ITaskRepository {
  constructor(private readonly adapter: StorageAdapter) {}

  /** Number of active (not trashed) direct children of a task. */
  private async countActiveChildren(id: string): Promise<Result<number, DomainError>> {
    const result = await this.adapter.getAll<Task>(TASK_PREFIX);
    if (!result.ok) return err(toDomainError(result.error));
    return ok(result.value.filter((task) => task.parentId === id && !task.deletedAt).length);
  }

  async list(projectId?: string): Promise<Result<Task[], DomainError>> {
    const result = await this.adapter.getAll<Task>(TASK_PREFIX);
    if (!result.ok) return err(toDomainError(result.error));

    let tasks = result.value.filter((task) => !task.deletedAt);

    if (projectId) {
      tasks = tasks.filter((task) => task.projectId === projectId);
    }

    return ok(
      tasks.sort((a, b) => {
        // Sort by status order: todo, in_progress, done
        const statusOrder: Record<TaskStatus, number> = { todo: 0, in_progress: 1, done: 2 };
        const statusDiff = statusOrder[a.status] - statusOrder[b.status];
        if (statusDiff !== 0) return statusDiff;
        // Then by priority (urgent first)
        const priorityOrder: Record<TaskPriority, number> = {
          urgent: 3,
          high: 2,
          medium: 1,
          low: 0,
        };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        // Then by due date (earliest first, nulls last)
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        // Finally by creation date (newest first)
        return b.createdAt.localeCompare(a.createdAt);
      })
    );
  }

  async listDeleted(): Promise<Result<Task[], DomainError>> {
    const result = await this.adapter.getAll<Task>(TASK_PREFIX);
    if (!result.ok) return err(toDomainError(result.error));
    return ok(
      result.value
        .filter((task) => task.deletedAt)
        .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''))
    );
  }

  async listChildren(parentId: string): Promise<Result<Task[], DomainError>> {
    const result = await this.adapter.getAll<Task>(TASK_PREFIX);
    if (!result.ok) return err(toDomainError(result.error));
    return ok(
      result.value
        .filter((task) => task.parentId === parentId && !task.deletedAt)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    );
  }

  async get(id: string): Promise<Result<Task, DomainError>> {
    const key = createStorageKey('tasks', id);
    const result = await this.adapter.get<Task>(key);
    if (!result.ok) return err(toDomainError(result.error));
    if (!result.value) return err(createNotFoundError('Task', id));
    return ok(result.value);
  }

  async create(input: TaskInput): Promise<Result<Task, DomainError>> {
    const validation = safeValidateTaskInput(input);
    if (!validation.success) {
      return err(zodErrorToValidationError(validation.error));
    }

    const validatedInput = validation.data;
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    // Sub-tasks inherit their parent's project and must reference a valid,
    // top-level task (depth is limited to one level).
    let projectId = validatedInput.projectId;
    if (validatedInput.parentId) {
      const parentResult = await this.get(validatedInput.parentId);
      if (!parentResult.ok) return err(parentIssueError('parent_not_found'));
      const issue = validateParentAssignment({
        taskId: '',
        parentId: validatedInput.parentId,
        parent: parentResult.value,
        taskHasChildren: false,
      });
      if (issue) return err(parentIssueError(issue));
      projectId = parentResult.value.projectId;
    }

    // Validate epic reference if provided.
    let epicId: string | undefined;
    if (validatedInput.epicId) {
      const allEpicsResult = await this.adapter.getAll<Epic>(EPIC_PREFIX);
      if (!allEpicsResult.ok) return err(toDomainError(allEpicsResult.error));
      const epic = allEpicsResult.value.find((e) => e.id === validatedInput.epicId && !e.deletedAt);
      if (!epic) {
        return err(
          createValidationError([
            {
              field: 'epicId',
              message: 'Referenced epic does not exist',
              code: 'invalid_epic_reference',
            },
          ])
        );
      }
      epicId = validatedInput.epicId;
    }

    const task: Task = {
      id,
      projectId,
      title: validatedInput.title,
      description: validatedInput.description,
      status: validatedInput.status,
      priority: validatedInput.priority,
      dueDate: validatedInput.dueDate,
      assignee: validatedInput.assignee,
      tags: validatedInput.tags,
      parentId: validatedInput.parentId,
      epicId,
      createdAt: now,
      updatedAt: now,
      completedAt: validatedInput.status === 'done' ? now : undefined,
    };

    const key = createStorageKey('tasks', id);
    const setResult = await this.adapter.set(key, task);
    if (!setResult.ok) return err(toDomainError(setResult.error));

    return ok(task);
  }

  async update(id: string, update: TaskUpdate): Promise<Result<Task, DomainError>> {
    const getResult = await this.get(id);
    if (!getResult.ok) return getResult;

    const validation = safeValidateTaskUpdate(update);
    if (!validation.success) {
      return err(zodErrorToValidationError(validation.error));
    }

    const task = getResult.value;
    const now = new Date().toISOString();

    // Re-validate the hierarchy when a parent reference is being set.
    if (validation.data.parentId) {
      const parentResult = await this.get(validation.data.parentId);
      if (!parentResult.ok) return err(parentIssueError('parent_not_found'));
      const childrenResult = await this.countActiveChildren(id);
      if (!childrenResult.ok) return err(childrenResult.error);
      const issue = validateParentAssignment({
        taskId: id,
        parentId: validation.data.parentId,
        parent: parentResult.value,
        taskHasChildren: childrenResult.value > 0,
      });
      if (issue) return err(parentIssueError(issue));
    }

    let completedAt = task.completedAt;

    if (update.status === 'done' && task.status !== 'done') {
      // Status changed to done - set completedAt
      completedAt = now;
    } else if (update.status !== undefined && update.status !== 'done' && task.status === 'done') {
      // Status changed from done to something else - clear completedAt
      completedAt = undefined;
    }

    const updatedTask: Task = {
      ...task,
      ...validation.data,
      updatedAt: now,
      completedAt,
    };

    const key = createStorageKey('tasks', id);
    const setResult = await this.adapter.set(key, updatedTask);
    if (!setResult.ok) return err(toDomainError(setResult.error));

    return ok(updatedTask);
  }

  async updateMany(ids: string[], update: TaskUpdate): Promise<Result<Task[], DomainError>> {
    // Validate once up front so an invalid payload fails fast (and error paths
    // stay covered) instead of relying on the per-task validation.
    const validation = safeValidateTaskUpdate(update);
    if (!validation.success) {
      return err(zodErrorToValidationError(validation.error));
    }

    const updated: Task[] = [];
    for (const id of ids) {
      const result = await this.update(id, validation.data);
      if (!result.ok) return result;
      updated.push(result.value);
    }

    return ok(updated);
  }

  async delete(id: string): Promise<Result<void, DomainError>> {
    const getResult = await this.get(id);
    if (!getResult.ok) return getResult;

    const now = new Date().toISOString();
    const deletedTask: Task = { ...getResult.value, deletedAt: now, updatedAt: now };

    const key = createStorageKey('tasks', id);
    const setResult = await this.adapter.set(key, deletedTask);
    if (!setResult.ok) return err(toDomainError(setResult.error));

    // Cascade: a parent's active sub-tasks move to the trash with it so the
    // hierarchy is never left dangling. Restoring the parent restores them.
    const childrenResult = await this.listChildren(id);
    if (!childrenResult.ok) return err(childrenResult.error);
    for (const child of childrenResult.value) {
      const childTask: Task = { ...child, deletedAt: now, updatedAt: now };
      const childSetResult = await this.adapter.set(createStorageKey('tasks', child.id), childTask);
      if (!childSetResult.ok) return err(toDomainError(childSetResult.error));
    }

    return ok(undefined);
  }

  async deleteMany(ids: string[]): Promise<Result<number, DomainError>> {
    let deletedCount = 0;
    for (const id of ids) {
      const result = await this.delete(id);
      if (!result.ok) return result;
      deletedCount++;
    }
    return ok(deletedCount);
  }

  async restore(id: string): Promise<Result<Task, DomainError>> {
    const getResult = await this.get(id);
    if (!getResult.ok) return getResult;

    const now = new Date().toISOString();
    const { deletedAt: _deletedAt, ...rest } = getResult.value;
    const restoredTask: Task = { ...rest, updatedAt: now };

    const key = createStorageKey('tasks', id);
    const setResult = await this.adapter.set(key, restoredTask);
    if (!setResult.ok) return err(toDomainError(setResult.error));

    // Cascade: restore sub-tasks that were trashed with their parent so the
    // hierarchy comes back whole.
    const allResult = await this.adapter.getAll<Task>(TASK_PREFIX);
    if (!allResult.ok) return err(toDomainError(allResult.error));
    for (const child of allResult.value) {
      if (child.parentId !== id || !child.deletedAt) continue;
      const { deletedAt: _childDeletedAt, ...childRest } = child;
      const childTask: Task = { ...childRest, updatedAt: now };
      const childSetResult = await this.adapter.set(createStorageKey('tasks', child.id), childTask);
      if (!childSetResult.ok) return err(toDomainError(childSetResult.error));
    }

    return ok(restoredTask);
  }

  async restoreMany(ids: string[]): Promise<Result<number, DomainError>> {
    let restoredCount = 0;
    for (const id of ids) {
      const result = await this.restore(id);
      if (!result.ok) return result;
      restoredCount++;
    }
    return ok(restoredCount);
  }

  async purge(id: string): Promise<Result<void, DomainError>> {
    const key = createStorageKey('tasks', id);
    const deleteResult = await this.adapter.delete(key);
    if (!deleteResult.ok) return err(toDomainError(deleteResult.error));

    return ok(undefined);
  }

  async deleteByProject(projectId: string): Promise<Result<number, DomainError>> {
    const listResult = await this.list(projectId);
    if (!listResult.ok) return listResult;

    let deletedCount = 0;
    for (const task of listResult.value) {
      const deleteResult = await this.delete(task.id);
      if (!deleteResult.ok) return deleteResult;
      deletedCount++;
    }

    return ok(deletedCount);
  }

  async restoreByProject(projectId: string): Promise<Result<number, DomainError>> {
    const result = await this.adapter.getAll<Task>(TASK_PREFIX);
    if (!result.ok) return err(toDomainError(result.error));

    let restoredCount = 0;
    for (const task of result.value) {
      if (task.projectId !== projectId || !task.deletedAt) continue;
      const restoreResult = await this.restore(task.id);
      if (!restoreResult.ok) return restoreResult;
      restoredCount++;
    }

    return ok(restoredCount);
  }

  async purgeByProject(projectId: string): Promise<Result<number, DomainError>> {
    const result = await this.adapter.getAll<Task>(TASK_PREFIX);
    if (!result.ok) return err(toDomainError(result.error));

    let purgedCount = 0;
    for (const task of result.value) {
      if (task.projectId !== projectId) continue;
      const purgeResult = await this.purge(task.id);
      if (!purgeResult.ok) return purgeResult;
      purgedCount++;
    }

    return ok(purgedCount);
  }

  async count(projectId?: string): Promise<Result<number, DomainError>> {
    const listResult = await this.list(projectId);
    if (!listResult.ok) return listResult;
    return ok(listResult.value.length);
  }

  async countByStatus(projectId: string): Promise<Result<Record<TaskStatus, number>, DomainError>> {
    const listResult = await this.list(projectId);
    if (!listResult.ok) return listResult;

    const counts: Record<TaskStatus, number> = {
      todo: 0,
      in_progress: 0,
      done: 0,
    };

    for (const task of listResult.value) {
      counts[task.status]++;
    }

    return ok(counts);
  }
}

export const createTaskRepository = (adapter: StorageAdapter): ITaskRepository => {
  return new LocalTaskRepository(adapter);
};
