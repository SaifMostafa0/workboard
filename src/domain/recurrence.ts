export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';

export const RECURRENCE_FREQUENCIES: RecurrenceFrequency[] = ['daily', 'weekly', 'monthly'];

export const RECURRENCE_FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  daily: 'daily',
  weekly: 'weekly',
  monthly: 'monthly',
};

/** The intentionally small recurrence subset Workboard supports. */
export interface TaskRecurrence {
  frequency: RecurrenceFrequency;
  /** Repeat every N days/weeks/months. */
  interval: number;
  /** Last allowed calendar date (inclusive), `YYYY-MM-DD`. */
  until?: string;
}

export const DEFAULT_RECURRENCE: TaskRecurrence = {
  frequency: 'weekly',
  interval: 1,
};

export const MIN_RECURRENCE_INTERVAL = 1;
export const MAX_RECURRENCE_INTERVAL = 99;

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

const parseCalendarDate = (value: string): CalendarDate | null => {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  // Date.UTC normalises invalid dates (e.g. 2026-02-31 → March 3), so compare
  // the components back to reject them.
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
};

const formatCalendarDate = (date: Date): string => {
  const year = date.getUTCFullYear().toString().padStart(4, '0');
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const daysInMonth = (year: number, monthIndex: number): number =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

/**
 * Returns the next calendar due date for a recurrence, or `undefined` when the
 * rule has ended (past its `until` date) or the inputs are malformed.
 *
 * Calendar dates are deliberately handled in UTC so the result never shifts by
 * a day when the user's local timezone crosses a DST boundary.
 */
export const nextRecurrenceDate = (
  currentDueDate: string,
  recurrence: TaskRecurrence
): string | undefined => {
  const parsed = parseCalendarDate(currentDueDate);
  if (!parsed) return undefined;
  if (
    !Number.isInteger(recurrence.interval) ||
    recurrence.interval < MIN_RECURRENCE_INTERVAL ||
    recurrence.interval > MAX_RECURRENCE_INTERVAL
  ) {
    return undefined;
  }

  let next: Date;
  if (recurrence.frequency === 'daily' || recurrence.frequency === 'weekly') {
    const days = recurrence.frequency === 'daily' ? recurrence.interval : recurrence.interval * 7;
    next = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + days));
  } else if (recurrence.frequency === 'monthly') {
    // Calendar months are not a fixed number of days. Preserve the original day
    // and clamp to the end of the target month (Jan 31 → Feb 28/29).
    const targetMonthIndex = parsed.month - 1 + recurrence.interval;
    const targetYear = parsed.year + Math.floor(targetMonthIndex / 12);
    const normalisedMonth = ((targetMonthIndex % 12) + 12) % 12;
    const day = Math.min(parsed.day, daysInMonth(targetYear, normalisedMonth));
    next = new Date(Date.UTC(targetYear, normalisedMonth, day));
  } else {
    return undefined;
  }

  const nextDate = formatCalendarDate(next);
  if (recurrence.until && nextDate > recurrence.until) return undefined;
  return nextDate;
};

export type RecurrenceIssue = 'recurrence_due_date' | 'recurrence_interval' | 'recurrence_until';

export const RECURRENCE_ISSUE_MESSAGES: Record<RecurrenceIssue, string> = {
  recurrence_due_date: 'Recurring tasks need a due date to anchor the schedule',
  recurrence_interval: `Repeat interval must be between ${MIN_RECURRENCE_INTERVAL} and ${MAX_RECURRENCE_INTERVAL}`,
  recurrence_until: 'The end date cannot be before the due date',
};

/** Validates a recurrence rule against the due date it repeats from. */
export const validateRecurrence = (
  recurrence: TaskRecurrence | undefined,
  dueDate: string | undefined
): RecurrenceIssue | null => {
  if (!recurrence) return null;
  if (!dueDate) return 'recurrence_due_date';
  if (
    !Number.isInteger(recurrence.interval) ||
    recurrence.interval < MIN_RECURRENCE_INTERVAL ||
    recurrence.interval > MAX_RECURRENCE_INTERVAL
  ) {
    return 'recurrence_interval';
  }
  if (recurrence.until && recurrence.until < dueDate) return 'recurrence_until';
  return null;
};

export const recurrenceLabel = (recurrence: TaskRecurrence): string => {
  const unit = RECURRENCE_FREQUENCY_LABELS[recurrence.frequency];
  const base = recurrence.interval === 1 ? `Every ${unit}` : `Every ${recurrence.interval} ${unit}`;
  return recurrence.until ? `${base} until ${recurrence.until}` : base;
};
