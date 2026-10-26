import {
  addDays,
  format,
  isSameMonth,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { Project } from './project';
import type { Task, TaskStatus } from './task';
import { TASK_PRIORITY_ORDER } from './task';

/**
 * Pure calendar model used by the Calendar page. Keeping the date bucketing
 * here means the UI only renders a ready-made grid and the month/week rules can
 * be tested without a DOM.
 */

export type CalendarViewMode = 'month' | 'week';

export const CALENDAR_VIEW_MODES: CalendarViewMode[] = ['month', 'week'];

/** Calendar dates are stored without a time component. */
export const CALENDAR_DATE_FORMAT = 'yyyy-MM-dd';

/** Sunday-first weeks match the rest of the app's date formatting. */
export const CALENDAR_WEEK_STARTS_ON = 0;

/** A stable month grid is always six weeks so the layout does not jump. */
export const CALENDAR_MONTH_DAY_COUNT = 42;

export const CALENDAR_WEEKDAY_LABELS = [
  { short: 'Sun', long: 'Sunday' },
  { short: 'Mon', long: 'Monday' },
  { short: 'Tue', long: 'Tuesday' },
  { short: 'Wed', long: 'Wednesday' },
  { short: 'Thu', long: 'Thursday' },
  { short: 'Fri', long: 'Friday' },
  { short: 'Sat', long: 'Saturday' },
] as const;

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface CalendarDay {
  /** `YYYY-MM-DD`, the same shape as a task's due date. */
  date: string;
  dayOfMonth: number;
  /** False for the adjacent-month days padding a month grid. */
  inCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  /** Tasks due on this day, already sorted for display. */
  tasks: Task[];
}

/** Tasks grouped under their project for the selected-day panel. */
export interface CalendarTaskGroup {
  /** `null` when a task refers to a project that no longer exists. */
  project: Pick<Project, 'id' | 'name' | 'color'> | null;
  tasks: Task[];
}

export interface CalendarModel {
  view: CalendarViewMode;
  anchor: string;
  today: string;
  rangeStart: string;
  rangeEnd: string;
  /** Every rendered day: 42 for a month, 7 for a week. */
  days: CalendarDay[];
  /** The rendered days split into rows of seven. */
  weeks: CalendarDay[][];
  /**
   * Tasks keyed by due date. This includes dates outside the visible range so
   * the selected-day panel still works for a shared `day` URL parameter.
   */
  tasksByDate: Map<string, Task[]>;
  /** Active tasks with no usable due date. */
  undatedTasks: Task[];
}

export interface CalendarOptions {
  /** Any date in the range to show. */
  anchor: string;
  view: CalendarViewMode;
  /** Injected for deterministic tests; defaults to the current local date. */
  today?: string;
}

/** Parse a calendar date (`YYYY-MM-DD`) and reject timestamps/invalid dates. */
export function parseCalendarDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!CALENDAR_DATE_PATTERN.test(trimmed)) return null;

  const parsed = parseISO(trimmed);
  return isValid(parsed) ? parsed : null;
}

/** Format a `Date` as the calendar-date shape used by tasks and URLs. */
export function toCalendarDate(date: Date): string {
  return format(date, CALENDAR_DATE_FORMAT);
}

/**
 * Normalise a task's due date to `YYYY-MM-DD`. Date-only values pass through;
 * legacy timestamp values are reduced to their local calendar date.
 */
export function getTaskDueDateKey(task: Pick<Task, 'dueDate'>): string | null {
  if (!task.dueDate) return null;

  const due = parseISO(task.dueDate);
  return isValid(due) ? format(due, CALENDAR_DATE_FORMAT) : null;
}

/** Overdue means a calendar date before today and not yet completed. */
export function isTaskOverdue(task: Pick<Task, 'dueDate' | 'status'>, today: string): boolean {
  const dueDate = getTaskDueDateKey(task);
  return dueDate !== null && dueDate < today && task.status !== 'done';
}

const STATUS_RANK: Record<TaskStatus, number> = {
  todo: 0,
  in_progress: 0,
  done: 1,
};

/** Open work first, then priority, then title. */
function compareTasksForCalendar(a: Task, b: Task): number {
  const statusDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
  if (statusDiff !== 0) return statusDiff;

  const priorityDiff = TASK_PRIORITY_ORDER[b.priority] - TASK_PRIORITY_ORDER[a.priority];
  if (priorityDiff !== 0) return priorityDiff;

  return a.title.localeCompare(b.title);
}

export function sortTasksForCalendar(tasks: Task[]): Task[] {
  return [...tasks].sort(compareTasksForCalendar);
}

/** Group a day's tasks by project, preserving the projects' display order. */
export function groupTasksByProject(tasks: Task[], projects: Project[]): CalendarTaskGroup[] {
  const tasksByProject = new Map<string, Task[]>();

  for (const task of tasks) {
    const bucket = tasksByProject.get(task.projectId);
    if (bucket) {
      bucket.push(task);
    } else {
      tasksByProject.set(task.projectId, [task]);
    }
  }

  const groups: CalendarTaskGroup[] = [];

  for (const project of projects) {
    const projectTasks = tasksByProject.get(project.id);
    if (!projectTasks?.length) continue;

    groups.push({
      project: { id: project.id, name: project.name, color: project.color },
      tasks: sortTasksForCalendar(projectTasks),
    });
    tasksByProject.delete(project.id);
  }

  // Tasks whose project was deleted still belong somewhere in the panel.
  const ungrouped = [...tasksByProject.values()].flat();
  if (ungrouped.length > 0) {
    groups.push({ project: null, tasks: sortTasksForCalendar(ungrouped) });
  }

  return groups;
}

export function chunkCalendarWeeks(days: CalendarDay[]): CalendarDay[][] {
  const weeks: CalendarDay[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }
  return weeks;
}

/**
 * Build the grid and due-date buckets for the Calendar page.
 *
 * Month view always covers six weeks starting on the Sunday on or before the
 * first of the month. Week view covers the seven days around the anchor. The
 * same anchor date keeps paging predictable when switching views.
 */
export function buildCalendarModel(tasks: Task[], options: CalendarOptions): CalendarModel {
  const todayDate = parseCalendarDate(options.today) ?? new Date();
  const today = toCalendarDate(todayDate);
  const anchorDate = parseCalendarDate(options.anchor) ?? todayDate;
  const anchor = toCalendarDate(anchorDate);

  const rangeStart =
    options.view === 'week'
      ? startOfWeek(anchorDate, { weekStartsOn: CALENDAR_WEEK_STARTS_ON })
      : startOfWeek(startOfMonth(anchorDate), { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
  const dayCount = options.view === 'week' ? 7 : CALENDAR_MONTH_DAY_COUNT;
  const rangeEnd = addDays(rangeStart, dayCount - 1);

  const tasksByDate = new Map<string, Task[]>();
  const undatedTasks: Task[] = [];

  for (const task of tasks) {
    const dueDate = getTaskDueDateKey(task);
    if (!dueDate) {
      undatedTasks.push(task);
      continue;
    }

    const bucket = tasksByDate.get(dueDate);
    if (bucket) {
      bucket.push(task);
    } else {
      tasksByDate.set(dueDate, [task]);
    }
  }

  for (const bucket of tasksByDate.values()) {
    bucket.sort(compareTasksForCalendar);
  }

  const days: CalendarDay[] = Array.from({ length: dayCount }, (_, index) => {
    const date = addDays(rangeStart, index);
    const key = toCalendarDate(date);
    const weekday = date.getDay();

    return {
      date: key,
      dayOfMonth: date.getDate(),
      inCurrentMonth: isSameMonth(date, anchorDate),
      isToday: key === today,
      isWeekend: weekday === 0 || weekday === 6,
      tasks: tasksByDate.get(key) ?? [],
    };
  });

  return {
    view: options.view,
    anchor,
    today,
    rangeStart: toCalendarDate(rangeStart),
    rangeEnd: toCalendarDate(rangeEnd),
    days,
    weeks: chunkCalendarWeeks(days),
    tasksByDate,
    undatedTasks: sortTasksForCalendar(undatedTasks),
  };
}
