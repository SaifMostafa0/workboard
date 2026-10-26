import { describe, expect, it } from 'vitest';
import {
  buildCalendarModel,
  chunkCalendarWeeks,
  getTaskDueDateKey,
  groupTasksByProject,
  isTaskOverdue,
  parseCalendarDate,
  sortTasksForCalendar,
  toCalendarDate,
  type CalendarDay,
} from '../calendar';
import type { Project } from '../project';
import type { Task } from '../task';

function makeTask(overrides: Partial<Task> & Pick<Task, 'id' | 'title'>): Task {
  return {
    projectId: 'project-1',
    description: '',
    status: 'todo',
    priority: 'medium',
    tags: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeProject(overrides: Partial<Project> & Pick<Project, 'id' | 'name'>): Project {
  return {
    description: '',
    color: 'blue',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('calendar dates', () => {
  it('parses and formats calendar dates', () => {
    const parsed = parseCalendarDate('2026-10-26');

    expect(parsed).not.toBeNull();
    expect(parsed && toCalendarDate(parsed)).toBe('2026-10-26');
    expect(parseCalendarDate('2026-10-26T10:00:00.000Z')).toBeNull();
    expect(parseCalendarDate('2026-02-31')).toBeNull();
    expect(parseCalendarDate('')).toBeNull();
    expect(parseCalendarDate(null)).toBeNull();
  });

  it('normalises date-only and timestamp due dates', () => {
    expect(getTaskDueDateKey({ dueDate: '2026-10-26' })).toBe('2026-10-26');
    expect(getTaskDueDateKey({ dueDate: '2026-10-26T00:00:00' })).toBe('2026-10-26');
    expect(getTaskDueDateKey({ dueDate: 'not-a-date' })).toBeNull();
    expect(getTaskDueDateKey({})).toBeNull();
  });

  it('flags only open tasks before today as overdue', () => {
    const due = { dueDate: '2026-10-25' };

    expect(isTaskOverdue({ ...due, status: 'todo' }, '2026-10-26')).toBe(true);
    expect(isTaskOverdue({ ...due, status: 'in_progress' }, '2026-10-26')).toBe(true);
    expect(isTaskOverdue({ ...due, status: 'done' }, '2026-10-26')).toBe(false);
    expect(isTaskOverdue({ dueDate: '2026-10-26', status: 'todo' }, '2026-10-26')).toBe(false);
    expect(isTaskOverdue({ dueDate: '2026-10-27', status: 'todo' }, '2026-10-26')).toBe(false);
  });
});

describe('buildCalendarModel', () => {
  it('renders a stable six-week month grid starting on Sunday', () => {
    const model = buildCalendarModel([], {
      anchor: '2026-10-26',
      view: 'month',
      today: '2026-10-26',
    });

    expect(model.rangeStart).toBe('2026-09-27');
    expect(model.rangeEnd).toBe('2026-11-07');
    expect(model.days).toHaveLength(42);
    expect(model.weeks).toHaveLength(6);
    expect(model.weeks.every((week) => week.length === 7)).toBe(true);

    const first = model.days[0];
    const last = model.days[41];
    expect(first).toMatchObject({
      date: '2026-09-27',
      dayOfMonth: 27,
      inCurrentMonth: false,
      isWeekend: true,
      isToday: false,
    });
    expect(last).toMatchObject({
      date: '2026-11-07',
      dayOfMonth: 7,
      inCurrentMonth: false,
      isWeekend: true,
    });
    expect(model.days.filter((day) => day.isToday)).toHaveLength(1);
    expect(model.days.find((day) => day.date === '2026-10-26')?.isToday).toBe(true);
    expect(model.days.find((day) => day.date === '2026-10-01')?.inCurrentMonth).toBe(true);
  });

  it('renders a seven-day week around the anchor', () => {
    const model = buildCalendarModel([], {
      anchor: '2026-10-28',
      view: 'week',
      today: '2026-10-26',
    });

    expect(model.rangeStart).toBe('2026-10-25');
    expect(model.rangeEnd).toBe('2026-10-31');
    expect(model.days).toHaveLength(7);
    expect(model.weeks).toHaveLength(1);
    expect(model.days.map((day) => day.date)).toEqual([
      '2026-10-25',
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
    ]);
    expect(model.days[1]?.isToday).toBe(true);
  });

  it('buckets tasks by calendar date, sorts them, and collects undated work', () => {
    const tasks = [
      makeTask({ id: 'late', title: 'Beta', dueDate: '2026-10-26', priority: 'medium' }),
      makeTask({
        id: 'early',
        title: 'Alpha',
        dueDate: '2026-10-26',
        priority: 'high',
        status: 'in_progress',
      }),
      makeTask({
        id: 'done',
        title: 'Done task',
        dueDate: '2026-10-26T00:00:00',
        priority: 'low',
        status: 'done',
      }),
      makeTask({ id: 'outside', title: 'Outside', dueDate: '2026-11-10' }),
      makeTask({ id: 'undated', title: 'Undated' }),
      makeTask({ id: 'invalid', title: 'Invalid', dueDate: 'not-a-date' }),
    ];

    const model = buildCalendarModel(tasks, {
      anchor: '2026-10-26',
      view: 'month',
      today: '2026-10-26',
    });

    expect(
      model.days.find((day) => day.date === '2026-10-26')?.tasks.map((task) => task.id)
    ).toEqual(['early', 'late', 'done']);
    expect(model.tasksByDate.get('2026-11-10')?.map((task) => task.id)).toEqual(['outside']);
    expect(model.undatedTasks.map((task) => task.id)).toEqual(['invalid', 'undated']);
  });

  it('falls back to today when the anchor is invalid', () => {
    const model = buildCalendarModel([], {
      anchor: 'not-a-date',
      view: 'month',
      today: '2026-10-26',
    });

    expect(model.anchor).toBe('2026-10-26');
    expect(model.rangeStart).toBe('2026-09-27');
  });
});

describe('calendar helpers', () => {
  it('chunks days into week rows', () => {
    const day = (date: string): CalendarDay => ({
      date,
      dayOfMonth: 1,
      inCurrentMonth: true,
      isToday: false,
      isWeekend: false,
      tasks: [],
    });

    const days = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(day);
    expect(chunkCalendarWeeks(days).map((week) => week.map((entry) => entry.date))).toEqual([
      ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      ['h'],
    ]);
  });

  it('sorts open work by priority before completed work', () => {
    const tasks = [
      makeTask({ id: 'done', title: 'Done', status: 'done', priority: 'urgent' }),
      makeTask({ id: 'low', title: 'Low', status: 'todo', priority: 'low' }),
      makeTask({ id: 'urgent', title: 'Urgent', status: 'in_progress', priority: 'urgent' }),
      makeTask({ id: 'high', title: 'High', status: 'todo', priority: 'high' }),
    ];

    expect(sortTasksForCalendar(tasks).map((task) => task.id)).toEqual([
      'urgent',
      'high',
      'low',
      'done',
    ]);
  });

  it('groups tasks by project in project order and puts unknown projects last', () => {
    const projects = [
      makeProject({ id: 'project-2', name: 'Beta project', color: 'green' }),
      makeProject({ id: 'project-1', name: 'Alpha project', color: 'blue' }),
    ];
    const tasks = [
      makeTask({ id: 'alpha', title: 'Alpha', projectId: 'project-1', priority: 'low' }),
      makeTask({ id: 'unknown', title: 'Unknown', projectId: 'deleted-project' }),
      makeTask({ id: 'beta', title: 'Beta', projectId: 'project-2' }),
    ];

    const groups = groupTasksByProject(tasks, projects);

    expect(groups.map((group) => group.project?.id ?? null)).toEqual([
      'project-2',
      'project-1',
      null,
    ]);
    expect(groups[0]?.project).toMatchObject({ id: 'project-2', color: 'green' });
    expect(groups[1]?.tasks.map((task) => task.id)).toEqual(['alpha']);
    expect(groups[2]?.tasks.map((task) => task.id)).toEqual(['unknown']);
  });
});
