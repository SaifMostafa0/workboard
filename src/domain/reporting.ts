import { addWeeks, endOfWeek, isValid, parseISO, startOfDay, startOfWeek } from 'date-fns';
import { CALENDAR_WEEK_STARTS_ON, parseCalendarDate, toCalendarDate } from './calendar';
import type { Project } from './project';
import type { Task } from './task';

/**
 * Pure reporting model. Every value is derived from task timestamps so the
 * page can stay a thin renderer and the maths can be tested with fixtures.
 */

export const REPORT_WEEK_OPTIONS = [4, 8, 12] as const;
export type ReportWeeks = (typeof REPORT_WEEK_OPTIONS)[number];
export const DEFAULT_REPORT_WEEKS: ReportWeeks = 8;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ReportWeek {
  /** Sunday starting the bucket (`YYYY-MM-DD`). */
  weekStart: string;
  /** End of the bucket; today for the current (partial) week. */
  weekEnd: string;
  completed: number;
  /** Tasks overdue at the end of this bucket. */
  overdue: number;
}

export interface ProjectCycleTime {
  /** `null` for tasks whose project no longer exists. */
  project: Pick<Project, 'id' | 'name' | 'color'> | null;
  completed: number;
  /** Average elapsed days from `createdAt` to `completedAt`. */
  averageDays: number | null;
}

export interface ReportModel {
  weeks: ReportWeeks;
  rangeStart: string;
  rangeEnd: string;
  buckets: ReportWeek[];
  totalCompleted: number;
  averageCompletedPerWeek: number;
  overallAverageCycleDays: number | null;
  overdueNow: number;
  cycleTimes: ProjectCycleTime[];
}

export interface ReportOptions {
  weeks: ReportWeeks;
  /** Injected for deterministic tests; defaults to the current time. */
  now?: Date;
}

export function normalizeReportWeeks(value: number | string | null | undefined): ReportWeeks {
  const parsed = typeof value === 'number' ? value : Number(value);
  return REPORT_WEEK_OPTIONS.includes(parsed as ReportWeeks)
    ? (parsed as ReportWeeks)
    : DEFAULT_REPORT_WEEKS;
}

function toDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

interface CompletedTask {
  created: Date;
  completed: Date;
}

function getCompletionWithin(task: Task, start: Date, end: Date): CompletedTask | null {
  if (task.status !== 'done') return null;
  const created = toDate(task.createdAt);
  const completed = toDate(task.completedAt);
  if (!created || !completed || created > completed) return null;
  if (completed < start || completed > end) return null;
  return { created, completed };
}

/**
 * Was the task counted as overdue at `reference`? A task is overdue when its
 * due date is before the reference day, it existed by then, and it had not
 * been completed by then. Historical completions are intentionally included:
 * that is what makes the chart a trend rather than a snapshot.
 */
function isOverdueAt(task: Task, reference: Date): boolean {
  const due = task.dueDate ? parseCalendarDate(task.dueDate) : null;
  const created = toDate(task.createdAt);
  if (!due || !created || created > reference) return false;
  if (due >= startOfDay(reference)) return false;

  const completed = toDate(task.completedAt);
  return completed === null || completed > reference;
}

interface CycleBucket {
  completed: number;
  totalDays: number;
}

function emptyCycleBucket(): CycleBucket {
  return { completed: 0, totalDays: 0 };
}

function toCycleTime(
  project: Pick<Project, 'id' | 'name' | 'color'> | null,
  bucket: CycleBucket | undefined
): ProjectCycleTime {
  const completed = bucket?.completed ?? 0;
  return {
    project,
    completed,
    averageDays: completed > 0 && bucket ? bucket.totalDays / completed : null,
  };
}

/**
 * Build weekly throughput, an overdue trend sampled at each week end, and
 * cycle time per project for the selected number of weeks. The current week is
 * included as a partial bucket that ends now.
 */
export function buildReportModel(
  tasks: Task[],
  projects: Project[],
  options: ReportOptions
): ReportModel {
  const now = options.now ?? new Date();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
  const firstWeekStart = addWeeks(currentWeekStart, -(options.weeks - 1));

  const buckets: ReportWeek[] = Array.from({ length: options.weeks }, (_, index) => {
    const weekStart = addWeeks(firstWeekStart, index);
    const naturalEnd = endOfWeek(weekStart, { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
    const weekEnd = naturalEnd > now ? now : naturalEnd;

    return {
      weekStart: toCalendarDate(weekStart),
      weekEnd: toCalendarDate(weekEnd),
      completed: tasks.filter((task) => getCompletionWithin(task, weekStart, weekEnd) !== null)
        .length,
      overdue: tasks.filter((task) => isOverdueAt(task, weekEnd)).length,
    };
  });

  const cycleBuckets = new Map<string, CycleBucket>();
  let overallCompleted = 0;
  let overallDays = 0;

  for (const task of tasks) {
    const completion = getCompletionWithin(task, firstWeekStart, now);
    if (!completion) continue;

    const days = (completion.completed.getTime() - completion.created.getTime()) / MS_PER_DAY;
    const bucket = cycleBuckets.get(task.projectId) ?? emptyCycleBucket();
    bucket.completed += 1;
    bucket.totalDays += days;
    cycleBuckets.set(task.projectId, bucket);

    overallCompleted += 1;
    overallDays += days;
  }

  const knownProjects = new Set(projects.map((project) => project.id));
  const cycleTimes: ProjectCycleTime[] = projects.map((project) =>
    toCycleTime(
      { id: project.id, name: project.name, color: project.color },
      cycleBuckets.get(project.id)
    )
  );

  let ungroupedBucket: CycleBucket | null = null;
  for (const [projectId, bucket] of cycleBuckets) {
    if (knownProjects.has(projectId)) continue;

    const target: CycleBucket = ungroupedBucket ?? emptyCycleBucket();
    target.completed += bucket.completed;
    target.totalDays += bucket.totalDays;
    ungroupedBucket = target;
  }

  if (ungroupedBucket) {
    cycleTimes.push(toCycleTime(null, ungroupedBucket));
  }

  const totalCompleted = buckets.reduce((total, bucket) => total + bucket.completed, 0);

  return {
    weeks: options.weeks,
    rangeStart: toCalendarDate(firstWeekStart),
    rangeEnd: toCalendarDate(now),
    buckets,
    totalCompleted,
    averageCompletedPerWeek: totalCompleted / options.weeks,
    overallAverageCycleDays: overallCompleted > 0 ? overallDays / overallCompleted : null,
    overdueNow: tasks.filter((task) => isOverdueAt(task, now)).length,
    cycleTimes,
  };
}
