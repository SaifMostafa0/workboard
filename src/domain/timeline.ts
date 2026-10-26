import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import {
  CALENDAR_WEEK_STARTS_ON,
  getTaskDueDateKey,
  isTaskOverdue,
  parseCalendarDate,
  toCalendarDate,
} from './calendar';
import type { Project } from './project';
import type { Task, TaskStatus } from './task';
import { TASK_PRIORITY_ORDER } from './task';

/**
 * Pure timeline/roadmap model. The page only renders project rows, tick columns
 * and already-positioned task bars; the date maths can be tested without a DOM.
 */

export type TimelineZoom = 'day' | 'week' | 'month';

export const TIMELINE_ZOOMS: TimelineZoom[] = ['day', 'week', 'month'];

export const TIMELINE_ZOOM_LABELS: Record<TimelineZoom, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
};

export const TIMELINE_DEFAULT_ZOOM: TimelineZoom = 'week';

/** How many days a bar may overlap before it moves to another lane. */
export const TIMELINE_LANE_GAP_DAYS: Record<TimelineZoom, number> = {
  day: 1,
  week: 3,
  month: 7,
};

export interface TimelineRange {
  zoom: TimelineZoom;
  /** First calendar date in the window (`YYYY-MM-DD`). */
  start: string;
  /** Last calendar date in the window (`YYYY-MM-DD`), inclusive. */
  end: string;
  /** Number of days covered by the window. */
  days: number;
}

export interface TimelineTick {
  /** Anchor date for the column (`YYYY-MM-DD`). */
  date: string;
  label: string;
  secondary: string;
  /** Left edge as a percentage of the track. */
  startPercent: number;
  /** Column width as a percentage of the track. */
  widthPercent: number;
}

export interface TimelineTask {
  task: Task;
  dueDate: string;
  /** Centre of the due-date day as a percentage of the track. */
  percent: number;
  overdue: boolean;
  lane: number;
}

export interface TimelineRow {
  /** `null` for tasks whose project no longer exists. */
  project: Pick<Project, 'id' | 'name' | 'color'> | null;
  tasks: TimelineTask[];
  lanes: number;
}

export interface TimelineModel {
  zoom: TimelineZoom;
  anchor: string;
  today: string;
  range: TimelineRange;
  ticks: TimelineTick[];
  rows: TimelineRow[];
  /** Tasks with no due date after the project/status filters. */
  undatedTasks: Task[];
  /** Dated tasks outside the current window after the filters. */
  outOfRangeTasks: Task[];
  /** Position of today's line, or `null` when today is outside the window. */
  todayPercent: number | null;
  datedTaskCount: number;
}

export interface TimelineOptions {
  /** Any date in the window to show. */
  anchor: string;
  zoom: TimelineZoom;
  /** Injected for deterministic tests; defaults to the current local date. */
  today?: string;
  projectId?: string;
  status?: TaskStatus;
}

function normalizeToday(value?: string): string {
  return toCalendarDate(parseCalendarDate(value) ?? new Date());
}

/**
 * Build the time window for a zoom level. The windows are deliberately wider
 * than the anchor date so there is planning context on both sides of "today":
 * 21 days, 12 weeks, and 12 months respectively.
 */
export function buildTimelineRange(anchor: string, zoom: TimelineZoom): TimelineRange {
  const anchorDate = parseCalendarDate(anchor) ?? new Date();

  let startDate: Date;
  let endDate: Date;

  switch (zoom) {
    case 'day':
      startDate = addDays(anchorDate, -10);
      endDate = addDays(anchorDate, 10);
      break;
    case 'month':
      startDate = startOfMonth(addMonths(anchorDate, -5));
      // The last month is the sixth month after the anchor, giving 12 columns.
      endDate = addDays(startOfMonth(addMonths(anchorDate, 7)), -1);
      break;
    case 'week':
    default:
      startDate = startOfWeek(addDays(anchorDate, -35), { weekStartsOn: CALENDAR_WEEK_STARTS_ON });
      endDate = addDays(startDate, 12 * 7 - 1);
      break;
  }

  return {
    zoom,
    start: toCalendarDate(startDate),
    end: toCalendarDate(endDate),
    days: differenceInCalendarDays(endDate, startDate) + 1,
  };
}

/** Move the window by roughly half its width without changing its span. */
export function shiftTimelineAnchor(anchor: string, zoom: TimelineZoom, direction: -1 | 1): string {
  const anchorDate = parseCalendarDate(anchor) ?? new Date();
  const next =
    zoom === 'day'
      ? addDays(anchorDate, direction * 10)
      : zoom === 'month'
        ? addMonths(anchorDate, direction * 6)
        : addDays(anchorDate, direction * 42);

  return toCalendarDate(next);
}

/**
 * Convert a calendar date to the centre of its day column. Returns `null` when
 * the date is outside the window, so callers can distinguish "not scheduled in
 * this window" from a position at the very edge.
 */
export function dateToTimelinePercent(
  date: string,
  rangeStart: string,
  rangeDays: number
): number | null {
  const parsed = parseCalendarDate(date);
  const start = parseCalendarDate(rangeStart);
  if (!parsed || !start || rangeDays <= 0) return null;

  const offset = differenceInCalendarDays(parsed, start);
  if (offset < 0 || offset >= rangeDays) return null;

  return ((offset + 0.5) / rangeDays) * 100;
}

function buildTicks(range: TimelineRange): TimelineTick[] {
  const start = parseCalendarDate(range.start);
  const end = parseCalendarDate(range.end);
  if (!start || !end) return [];

  const ticks: TimelineTick[] = [];

  if (range.zoom === 'day') {
    for (let index = 0; index < range.days; index += 1) {
      const date = addDays(start, index);
      const dateKey = toCalendarDate(date);
      ticks.push({
        date: dateKey,
        label: format(date, 'EEE'),
        secondary: format(date, 'd'),
        startPercent: (index / range.days) * 100,
        widthPercent: 100 / range.days,
      });
    }
    return ticks;
  }

  if (range.zoom === 'week') {
    for (let date = start; date <= end; date = addDays(date, 7)) {
      const index = differenceInCalendarDays(date, start);
      const days = Math.min(7, range.days - index);
      ticks.push({
        date: toCalendarDate(date),
        label: format(date, 'MMM d'),
        secondary: '',
        startPercent: (index / range.days) * 100,
        widthPercent: (days / range.days) * 100,
      });
    }
    return ticks;
  }

  for (let date = startOfMonth(start); date <= end; date = startOfMonth(addMonths(date, 1))) {
    const index = differenceInCalendarDays(date, start);
    const monthEnd = addDays(startOfMonth(addMonths(date, 1)), -1);
    const lastDay = monthEnd > end ? end : monthEnd;
    const days = differenceInCalendarDays(lastDay, date) + 1;
    ticks.push({
      date: toCalendarDate(date),
      label: format(date, 'MMM'),
      secondary: format(date, 'yyyy'),
      startPercent: (index / range.days) * 100,
      widthPercent: (days / range.days) * 100,
    });
  }

  return ticks;
}

function compareTasksByDueDate(a: Task, b: Task): number {
  const dueA = getTaskDueDateKey(a) ?? '';
  const dueB = getTaskDueDateKey(b) ?? '';
  const dueDiff = dueA.localeCompare(dueB);
  if (dueDiff !== 0) return dueDiff;

  const priorityDiff = TASK_PRIORITY_ORDER[b.priority] - TASK_PRIORITY_ORDER[a.priority];
  if (priorityDiff !== 0) return priorityDiff;

  return a.title.localeCompare(b.title);
}

function buildRow(
  project: Pick<Project, 'id' | 'name' | 'color'> | null,
  tasks: Task[],
  range: TimelineRange,
  zoom: TimelineZoom,
  today: string
): TimelineRow {
  const laneEnds: string[] = [];
  const gap = TIMELINE_LANE_GAP_DAYS[zoom];

  const timelineTasks: TimelineTask[] = [...tasks].sort(compareTasksByDueDate).map((task) => {
    const dueDate = getTaskDueDateKey(task) ?? range.start;
    const due = parseCalendarDate(dueDate);
    let lane = laneEnds.findIndex((lastDate) => {
      const last = parseCalendarDate(lastDate);
      return due !== null && last !== null && differenceInCalendarDays(due, last) >= gap;
    });

    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(dueDate);
    } else {
      laneEnds[lane] = dueDate;
    }

    return {
      task,
      dueDate,
      percent: dateToTimelinePercent(dueDate, range.start, range.days) ?? 0,
      overdue: isTaskOverdue(task, today),
      lane,
    };
  });

  return {
    project,
    tasks: timelineTasks,
    lanes: Math.max(1, laneEnds.length),
  };
}

/**
 * Build project rows, ticks and positioned task bars for the timeline page.
 * Empty projects are kept so the roadmap still shows their place in the plan.
 */
export function buildTimelineModel(
  tasks: Task[],
  projects: Project[],
  options: TimelineOptions
): TimelineModel {
  const today = normalizeToday(options.today);
  const anchorDate = parseCalendarDate(options.anchor);
  const anchor = anchorDate ? toCalendarDate(anchorDate) : today;
  const range = buildTimelineRange(anchor, options.zoom);

  const visibleTasks = tasks.filter((task) => {
    if (options.projectId && task.projectId !== options.projectId) return false;
    if (options.status && task.status !== options.status) return false;
    return true;
  });

  const undatedTasks: Task[] = [];
  const outOfRangeTasks: Task[] = [];
  const tasksByProject = new Map<string, Task[]>();

  for (const task of visibleTasks) {
    const dueDate = getTaskDueDateKey(task);
    if (!dueDate) {
      undatedTasks.push(task);
      continue;
    }
    if (dueDate < range.start || dueDate > range.end) {
      outOfRangeTasks.push(task);
      continue;
    }

    const bucket = tasksByProject.get(task.projectId);
    if (bucket) {
      bucket.push(task);
    } else {
      tasksByProject.set(task.projectId, [task]);
    }
  }

  const orderedProjects = options.projectId
    ? projects.filter((project) => project.id === options.projectId)
    : projects;

  const rows: TimelineRow[] = orderedProjects.map((project) => {
    const projectTasks = tasksByProject.get(project.id) ?? [];
    tasksByProject.delete(project.id);
    return buildRow(
      { id: project.id, name: project.name, color: project.color },
      projectTasks,
      range,
      options.zoom,
      today
    );
  });

  const ungroupedTasks = [...tasksByProject.values()].flat();
  if (ungroupedTasks.length > 0) {
    rows.push(buildRow(null, ungroupedTasks, range, options.zoom, today));
  }

  return {
    zoom: options.zoom,
    anchor,
    today,
    range,
    ticks: buildTicks(range),
    rows,
    undatedTasks: [...undatedTasks].sort(compareTasksByDueDate),
    outOfRangeTasks: [...outOfRangeTasks].sort(compareTasksByDueDate),
    todayPercent: dateToTimelinePercent(today, range.start, range.days),
    datedTaskCount: rows.reduce((total, row) => total + row.tasks.length, 0),
  };
}
