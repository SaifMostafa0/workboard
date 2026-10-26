import { describe, expect, it } from 'vitest';
import type { Project } from '../project';
import type { Task } from '../task';
import {
  buildTimelineModel,
  buildTimelineRange,
  dateToTimelinePercent,
  shiftTimelineAnchor,
  type TimelineZoom,
} from '../timeline';

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

describe('timeline range', () => {
  it.each<[TimelineZoom, string, string, number]>([
    ['day', '2026-10-16', '2026-11-05', 21],
    ['week', '2026-09-20', '2026-12-12', 84],
    ['month', '2026-05-01', '2027-04-30', 365],
  ])('builds a %s window around the anchor', (zoom, start, end, days) => {
    const range = buildTimelineRange('2026-10-26', zoom);
    expect(range).toEqual({ zoom, start, end, days });
  });

  it('moves by roughly half a window', () => {
    expect(shiftTimelineAnchor('2026-10-26', 'day', 1)).toBe('2026-11-05');
    expect(shiftTimelineAnchor('2026-10-26', 'day', -1)).toBe('2026-10-16');
    expect(shiftTimelineAnchor('2026-10-26', 'week', 1)).toBe('2026-12-07');
    expect(shiftTimelineAnchor('2026-10-26', 'month', 1)).toBe('2027-04-26');
  });
});

describe('dateToTimelinePercent', () => {
  it('returns the centre of each day column', () => {
    expect(dateToTimelinePercent('2026-01-01', '2026-01-01', 10)).toBe(5);
    expect(dateToTimelinePercent('2026-01-10', '2026-01-01', 10)).toBe(95);
  });

  it('rejects dates outside the window and invalid input', () => {
    expect(dateToTimelinePercent('2025-12-31', '2026-01-01', 10)).toBeNull();
    expect(dateToTimelinePercent('2026-01-11', '2026-01-01', 10)).toBeNull();
    expect(dateToTimelinePercent('not-a-date', '2026-01-01', 10)).toBeNull();
    expect(dateToTimelinePercent('2026-01-01', '2026-01-01', 0)).toBeNull();
  });
});

describe('buildTimelineModel', () => {
  const projects = [
    makeProject({ id: 'project-1', name: 'Alpha' }),
    makeProject({ id: 'project-2', name: 'Beta', color: 'green' }),
    makeProject({ id: 'project-3', name: 'Gamma', color: 'purple' }),
  ];

  const tasks = [
    makeTask({ id: 't1', title: 'First', dueDate: '2026-10-27', priority: 'high' }),
    makeTask({ id: 't2', title: 'Second', dueDate: '2026-10-27' }),
    makeTask({ id: 't3', title: 'Third', dueDate: '2026-10-30' }),
    makeTask({ id: 't4', title: 'Undated' }),
    makeTask({ id: 't5', title: 'Later', dueDate: '2026-12-31' }),
    makeTask({
      id: 't6',
      title: 'Finished',
      dueDate: '2026-10-27',
      status: 'done',
      priority: 'low',
    }),
    makeTask({ id: 't7', title: 'Beta task', projectId: 'project-2', dueDate: '2026-10-28' }),
  ];

  it('positions tasks, packs overlapping dates into lanes, and keeps empty projects', () => {
    const model = buildTimelineModel(tasks, projects, {
      anchor: '2026-10-26',
      zoom: 'day',
      today: '2026-10-26',
    });

    expect(model.todayPercent).toBe(50);
    expect(model.ticks).toHaveLength(21);
    expect(model.rows.map((row) => row.project?.id)).toEqual([
      'project-1',
      'project-2',
      'project-3',
    ]);
    expect(model.undatedTasks.map((task) => task.id)).toEqual(['t4']);
    expect(model.outOfRangeTasks.map((task) => task.id)).toEqual(['t5']);
    expect(model.datedTaskCount).toBe(5);

    const [alpha, beta, gamma] = model.rows;
    if (!alpha || !beta || !gamma) throw new Error('Expected three project rows');

    expect(alpha.lanes).toBe(3);
    const first = alpha.tasks.find((entry) => entry.task.id === 't1');
    expect(first?.percent).toBeCloseTo(54.7619, 3);
    expect(first?.lane).toBe(0);
    expect(alpha.tasks.find((entry) => entry.task.id === 't2')?.lane).toBe(1);
    expect(alpha.tasks.find((entry) => entry.task.id === 't3')?.lane).toBe(0);

    expect(beta.tasks).toHaveLength(1);
    expect(beta.tasks[0]?.task.id).toBe('t7');

    expect(gamma.tasks).toEqual([]);
    expect(gamma.lanes).toBe(1);
  });

  it('applies project and status filters before building rows', () => {
    const done = buildTimelineModel(tasks, projects, {
      anchor: '2026-10-26',
      zoom: 'week',
      today: '2026-10-26',
      projectId: 'project-1',
      status: 'done',
    });

    expect(done.rows).toHaveLength(1);
    expect(done.rows[0]?.project?.id).toBe('project-1');
    expect(done.rows[0]?.tasks.map((entry) => entry.task.id)).toEqual(['t6']);
    expect(done.undatedTasks).toEqual([]);
    expect(done.outOfRangeTasks).toEqual([]);
    expect(done.ticks).toHaveLength(12);
  });

  it('keeps a selected project row even when it has no tasks', () => {
    const model = buildTimelineModel(tasks, projects, {
      anchor: '2026-10-26',
      zoom: 'day',
      today: '2026-10-26',
      projectId: 'project-3',
      status: 'todo',
    });

    expect(model.rows).toHaveLength(1);
    expect(model.rows[0]?.project?.name).toBe('Gamma');
    expect(model.rows[0]?.tasks).toEqual([]);
  });

  it('uses month ticks and renders an empty roadmap without tasks', () => {
    const model = buildTimelineModel([], projects, {
      anchor: '2026-10-26',
      zoom: 'month',
      today: '2026-10-26',
    });

    expect(model.rows).toHaveLength(3);
    expect(model.rows.every((row) => row.tasks.length === 0)).toBe(true);
    expect(model.ticks).toHaveLength(12);
    expect(model.ticks[0]?.date).toBe('2026-05-01');
    expect(model.ticks[11]?.date).toBe('2027-04-01');
    expect(model.datedTaskCount).toBe(0);
  });

  it('hides the today marker when today is outside the window', () => {
    const model = buildTimelineModel(tasks, projects, {
      anchor: '2027-06-01',
      zoom: 'week',
      today: '2026-10-26',
    });

    expect(model.todayPercent).toBeNull();
  });
});
