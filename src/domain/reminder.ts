import type { Task, TaskPriority } from './task';

export const REMINDER_LEAD_OPTIONS = [0, 1, 3, 7] as const;
export type ReminderLeadDays = (typeof REMINDER_LEAD_OPTIONS)[number];
export const DEFAULT_REMINDER_LEAD_DAYS: ReminderLeadDays = 1;

export type ReminderKind = 'overdue' | 'today' | 'upcoming';

export interface ReminderCandidate {
  task: Task;
  dueDate: string;
  daysUntilDue: number;
  kind: ReminderKind;
  /** Stable identity used to avoid notifying twice for the same due date. */
  key: string;
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
  urgent: 3,
};

const localCalendarDate = (date: Date): string => {
  const year = date.getFullYear().toString().padStart(4, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const dayDifference = (fromDate: string, toDate: string): number => {
  const from = Date.parse(`${fromDate}T00:00:00Z`);
  const to = Date.parse(`${toDate}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
};

/**
 * Pure reminder selection. A task is eligible when it is active, not done and
 * has a due date that is either overdue, today, or within the configured lead
 * window. Systems clocks are injected so tests are deterministic.
 */
export const getReminderCandidates = (
  tasks: ReadonlyArray<Task>,
  options: { leadDays: number; now?: Date }
): ReminderCandidate[] => {
  const today = localCalendarDate(options.now ?? new Date());
  const leadDays = Math.max(0, Math.trunc(options.leadDays));
  const candidates: ReminderCandidate[] = [];

  for (const task of tasks) {
    if (task.deletedAt || task.status === 'done' || !task.dueDate) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)) continue;
    const daysUntilDue = dayDifference(today, task.dueDate);
    let kind: ReminderKind | null = null;
    if (daysUntilDue < 0) kind = 'overdue';
    else if (daysUntilDue === 0) kind = 'today';
    else if (daysUntilDue <= leadDays) kind = 'upcoming';
    if (!kind) continue;

    candidates.push({
      task,
      dueDate: task.dueDate,
      daysUntilDue,
      kind,
      key: `${task.id}:${task.dueDate}:${kind}`,
    });
  }

  return candidates.sort((left, right) => {
    if (left.dueDate !== right.dueDate) return left.dueDate.localeCompare(right.dueDate);
    return PRIORITY_ORDER[right.task.priority] - PRIORITY_ORDER[left.task.priority];
  });
};

export const describeReminder = (candidate: ReminderCandidate): string => {
  if (candidate.kind === 'overdue') {
    const days = Math.abs(candidate.daysUntilDue);
    return days === 1 ? 'Overdue by 1 day' : `Overdue by ${days} days`;
  }
  if (candidate.kind === 'today') return 'Due today';
  return candidate.daysUntilDue === 1 ? 'Due tomorrow' : `Due in ${candidate.daysUntilDue} days`;
};
