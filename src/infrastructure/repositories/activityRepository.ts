import type { TaskActivity } from '@/domain/activity';
import { isTaskActivity } from '@/domain/activity';
import type { DomainError, StorageError, ValidationError } from '@/domain/errors';
import { createValidationError } from '@/domain/errors';
import { taskActivitySchema } from '@/domain/validation';
import type { Result, StorageAdapter } from '@/infrastructure/storage/storageAdapter';
import {
  createCollectionPrefix,
  createStorageKey,
  err,
  ok,
} from '@/infrastructure/storage/storageAdapter';

const ACTIVITY_PREFIX = createCollectionPrefix('activity');

const storageKey = (taskId: string, activityId: string): string =>
  createStorageKey('activity', `${taskId}:${activityId}`);

const taskPrefix = (taskId: string): string => `${ACTIVITY_PREFIX}${taskId}:`;

export interface ITaskActivityRepository {
  list(taskId: string): Promise<Result<TaskActivity[], DomainError>>;
  comment(
    taskId: string,
    message: string,
    authorName?: string
  ): Promise<Result<TaskActivity, DomainError>>;
  add(activity: TaskActivity): Promise<Result<TaskActivity, DomainError>>;
  clearForTask(taskId: string): Promise<Result<void, DomainError>>;
}

export class LocalTaskActivityRepository implements ITaskActivityRepository {
  constructor(private readonly adapter: StorageAdapter) {}

  async list(taskId: string): Promise<Result<TaskActivity[], DomainError>> {
    const result = await this.adapter.getAll<TaskActivity>(taskPrefix(taskId));
    if (!result.ok) return err(result.error);
    return ok(
      result.value
        .filter((activity) => isTaskActivity(activity) && activity.taskId === taskId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
    );
  }

  async add(activity: TaskActivity): Promise<Result<TaskActivity, DomainError>> {
    const validation = taskActivitySchema.safeParse(activity);
    if (!validation.success) {
      return err(
        createValidationError(
          validation.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          }))
        )
      );
    }
    const result = await this.adapter.set(
      storageKey(activity.taskId, activity.id),
      validation.data
    );
    if (!result.ok) return err(result.error);
    return ok(validation.data);
  }

  async comment(
    taskId: string,
    message: string,
    authorName?: string
  ): Promise<Result<TaskActivity, DomainError>> {
    const trimmed = message.trim();
    if (!trimmed) {
      return err(
        createValidationError([
          { field: 'message', message: 'Comment cannot be empty', code: 'comment_empty' },
        ])
      );
    }
    if (trimmed.length > 2000) {
      return err(
        createValidationError([
          {
            field: 'message',
            message: 'Comment must be 2000 characters or less',
            code: 'comment_too_long',
          },
        ])
      );
    }

    return this.add({
      id: crypto.randomUUID(),
      taskId,
      kind: 'comment',
      message: trimmed,
      authorName,
      createdAt: new Date().toISOString(),
    });
  }

  async clearForTask(taskId: string): Promise<Result<void, DomainError>> {
    const result = await this.adapter.clear(taskPrefix(taskId));
    return result.ok ? ok(undefined) : err(result.error);
  }
}

/**
 * Appends an activity entry without requiring a repository instance. Used by
 * the task repository (which already owns just a StorageAdapter) and by the
 * import pipeline.
 */
export const appendTaskActivity = async (
  adapter: StorageAdapter,
  activity: TaskActivity
): Promise<Result<TaskActivity, StorageError | ValidationError>> => {
  const parsed = taskActivitySchema.safeParse(activity);
  if (!parsed.success) {
    return err(
      createValidationError(
        parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        }))
      )
    );
  }
  const result = await adapter.set(storageKey(activity.taskId, activity.id), parsed.data);
  return result.ok ? ok(parsed.data) : err(result.error);
};

export const clearTaskActivities = async (
  adapter: StorageAdapter,
  taskId: string
): Promise<Result<void, StorageError>> => {
  const result = await adapter.clear(taskPrefix(taskId));
  return result.ok ? ok(undefined) : err(result.error);
};

export const createTaskActivity = (params: {
  taskId: string;
  kind: TaskActivity['kind'];
  now?: string;
  field?: string;
  from?: string;
  to?: string;
  message?: string;
}): TaskActivity => ({
  id: crypto.randomUUID(),
  taskId: params.taskId,
  kind: params.kind,
  field: params.field,
  from: params.from,
  to: params.to,
  message: params.message,
  createdAt: params.now ?? new Date().toISOString(),
});

export const createTaskActivityRepository = (adapter: StorageAdapter): ITaskActivityRepository =>
  new LocalTaskActivityRepository(adapter);

// Backwards-compatible descriptive alias used by the hooks layer.
export const createActivityRepository = createTaskActivityRepository;
