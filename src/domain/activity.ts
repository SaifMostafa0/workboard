import type { Task } from './task';

export const TASK_ACTIVITY_KINDS = [
  'task_created',
  'task_imported',
  'task_updated',
  'comment',
  'attachment_added',
  'attachment_removed',
  'recurrence_scheduled',
] as const;

export type TaskActivityKind = (typeof TASK_ACTIVITY_KINDS)[number];

export interface TaskActivity {
  id: string;
  taskId: string;
  kind: TaskActivityKind;
  /** Field name for `task_updated` entries (e.g. `status`). */
  field?: string;
  from?: string;
  to?: string;
  message?: string;
  /** Reserved for future collaboration; omitted for the local user. */
  authorId?: string;
  authorName?: string;
  createdAt: string;
}

export const TRACKED_ACTIVITY_FIELDS = [
  'status',
  'priority',
  'assignee',
  'dueDate',
  'title',
  'recurrence',
] as const;

export type TrackedActivityField = (typeof TRACKED_ACTIVITY_FIELDS)[number];

const FIELD_LABELS: Record<TrackedActivityField, string> = {
  status: 'status',
  priority: 'priority',
  assignee: 'assignee',
  dueDate: 'due date',
  title: 'title',
  recurrence: 'recurrence',
};

const stringifyValue = (value: unknown): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return undefined;
    }
  }
  return String(value);
};

const valuesEqual = (left: unknown, right: unknown): boolean => {
  if (left === right) return true;
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    return JSON.stringify(left) === JSON.stringify(right);
  }
  return false;
};

export interface TaskActivityChange {
  field: TrackedActivityField;
  from?: string;
  to?: string;
}

/** Pure diff used by the repository to generate change-history entries. */
export const diffTaskForActivity = (
  before: Task,
  after: Task,
  fields: readonly TrackedActivityField[] = TRACKED_ACTIVITY_FIELDS
): TaskActivityChange[] => {
  const changes: TaskActivityChange[] = [];
  for (const field of fields) {
    const previous = before[field];
    const next = after[field];
    if (valuesEqual(previous, next)) continue;
    changes.push({ field, from: stringifyValue(previous), to: stringifyValue(next) });
  }
  return changes;
};

export const fieldLabel = (field: string): string =>
  field in FIELD_LABELS ? FIELD_LABELS[field as TrackedActivityField] : field;

export const describeActivity = (activity: TaskActivity): string => {
  switch (activity.kind) {
    case 'task_created':
      return 'Created this task';
    case 'task_imported':
      return 'Imported this task';
    case 'task_updated': {
      const label = fieldLabel(activity.field ?? 'task');
      if (activity.from && activity.to)
        return `Changed ${label} from ${activity.from} to ${activity.to}`;
      if (activity.to) return `Set ${label} to ${activity.to}`;
      if (activity.from) return `Cleared ${label}`;
      return `Updated ${label}`;
    }
    case 'comment':
      return 'Commented';
    case 'attachment_added':
      return activity.to ? `Attached ${activity.to}` : 'Added an attachment';
    case 'attachment_removed':
      return activity.to ? `Removed attachment ${activity.to}` : 'Removed an attachment';
    case 'recurrence_scheduled':
      return activity.to
        ? `Scheduled the next occurrence for ${activity.to}`
        : 'Scheduled the next occurrence';
    default:
      return 'Updated this task';
  }
};

export const isTaskActivity = (value: unknown): value is TaskActivity => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.taskId === 'string' &&
    typeof candidate.kind === 'string' &&
    (TASK_ACTIVITY_KINDS as readonly string[]).includes(candidate.kind) &&
    typeof candidate.createdAt === 'string'
  );
};
