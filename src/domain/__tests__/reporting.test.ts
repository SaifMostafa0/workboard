import { describe, expect, it } from 'vitest';
import type { Project } from '../project';
import {
  DEFAULT_REPORT_WEEKS,
  buildReportModel,
  normalizeReportWeeks,
  type ReportWeeks,
} from '../reporting';
import type { Task } from '../task';

function makeTask(overrides: Partial<Task> & Pick<Task, 'id' | 'title'>): Task {
  return {
    projectId: 'project-1',
    description: '',
    status: 'todo',
    priority: 'medium',
    tags: [],
    createdAt: '2026-10-01T00:00:00',
    updatedAt: '2026-10-01T00:00:00',
    ...overrides,
  };
}

function makeProject(overrides: Partial<Project> & Pick<Project, 'id' | 'name'>): Project {
  return {
    description: '',
    color: 'blue',
    createdAt: '2026-01-01T00:00:00',
    updatedAt: '2026-01-01T00:00:00',
    ...overrides,
  };
}

const now = new Date(2026, 9, 26, 12, 0, 0);

const projects = [
  makeProject({ id: 'project-1', name: 'Alpha' }),
  makeProject({ id: 'project-2', name: 'Beta', color: 'green' }),
  makeProject({ id: 'project-3', name: 'Gamma', color: 'purple' }),
];

const tasks = [
  makeTask({
    id: 't1',
    title: 'Completed in week one',
    dueDate: '2026-10-10',
    status: 'done',
    completedAt: '2026-10-05T00:00:00',
  }),
  makeTask({
    id: 't2',
    title: 'Completed today',
    dueDate: '2026-10-24',
    status: 'done',
    createdAt: '2026-10-20T00:00:00',
    completedAt: '2026-10-26T10:00:00',
  }),
  makeTask({
    id: 't3',
    title: 'Still overdue',
    dueDate: '2026-10-12',
  }),
  makeTask({
    id: 't4',
    title: 'Beta completed before its due date',
    projectId: 'project-2',
    dueDate: '2026-10-20',
    status: 'done',
    createdAt: '2026-10-18T00:00:00',
    completedAt: '2026-10-22T00:00:00',
  }),
  makeTask({
    id: 't5',
    title: 'Beta overdue then completed',
    projectId: 'project-2',
    dueDate: '2026-10-10',
    status: 'done',
    createdAt: '2026-10-20T00:00:00',
    completedAt: '2026-10-25T00:00:00',
  }),
  makeTask({
    id: 't6',
    title: 'Due in the future',
    dueDate: '2026-10-27',
  }),
  makeTask({
    id: 't7',
    title: 'Completed before the range',
    status: 'done',
    createdAt: '2026-09-01T00:00:00',
    completedAt: '2026-09-10T00:00:00',
  }),
  makeTask({
    id: 't8',
    title: 'Completed without a project record',
    projectId: 'deleted-project',
    status: 'done',
    createdAt: '2026-10-20T00:00:00',
    completedAt: '2026-10-25T00:00:00',
  }),
];

describe('normalizeReportWeeks', () => {
  it('accepts supported ranges and falls back to the default', () => {
    expect(normalizeReportWeeks(4)).toBe(4);
    expect(normalizeReportWeeks('8')).toBe(8);
    expect(normalizeReportWeeks(12)).toBe(12);
    expect(normalizeReportWeeks(5)).toBe(DEFAULT_REPORT_WEEKS);
    expect(normalizeReportWeeks(null)).toBe(DEFAULT_REPORT_WEEKS);
    expect(normalizeReportWeeks(undefined)).toBe(DEFAULT_REPORT_WEEKS);
  });
});

describe('buildReportModel', () => {
  it('builds weekly throughput and an overdue trend for the selected range', () => {
    const model = buildReportModel(tasks, projects, { weeks: 4, now });

    expect(model.rangeStart).toBe('2026-10-04');
    expect(model.rangeEnd).toBe('2026-10-26');
    expect(model.buckets).toEqual([
      { weekStart: '2026-10-04', weekEnd: '2026-10-10', completed: 1, overdue: 0 },
      { weekStart: '2026-10-11', weekEnd: '2026-10-17', completed: 0, overdue: 1 },
      { weekStart: '2026-10-18', weekEnd: '2026-10-24', completed: 1, overdue: 2 },
      { weekStart: '2026-10-25', weekEnd: '2026-10-26', completed: 3, overdue: 1 },
    ]);
    expect(model.totalCompleted).toBe(5);
    expect(model.averageCompletedPerWeek).toBe(1.25);
    expect(model.overdueNow).toBe(1);
  });

  it('calculates average cycle time per project and overall', () => {
    const model = buildReportModel(tasks, projects, { weeks: 4, now });

    expect(model.overallAverageCycleDays).toBeCloseTo(4.8833, 4);

    const [alpha, beta, gamma, ungrouped] = model.cycleTimes;
    expect(alpha?.project?.name).toBe('Alpha');
    expect(alpha?.completed).toBe(2);
    expect(alpha?.averageDays).toBeCloseTo(5.2083, 4);

    expect(beta?.project?.name).toBe('Beta');
    expect(beta?.completed).toBe(2);
    expect(beta?.averageDays).toBe(4.5);

    expect(gamma?.project?.name).toBe('Gamma');
    expect(gamma?.completed).toBe(0);
    expect(gamma?.averageDays).toBeNull();

    expect(ungrouped?.project).toBeNull();
    expect(ungrouped?.completed).toBe(1);
    expect(ungrouped?.averageDays).toBe(5);
  });

  it('aggregates multiple missing projects into one ungrouped row', () => {
    const model = buildReportModel(
      [
        makeTask({
          id: 'orphan-a',
          title: 'Orphan A',
          projectId: 'deleted-a',
          status: 'done',
          createdAt: '2026-10-20T00:00:00',
          completedAt: '2026-10-25T00:00:00',
        }),
        makeTask({
          id: 'orphan-b',
          title: 'Orphan B',
          projectId: 'deleted-b',
          status: 'done',
          createdAt: '2026-10-21T00:00:00',
          completedAt: '2026-10-25T00:00:00',
        }),
      ],
      projects,
      { weeks: 4, now }
    );

    const ungrouped = model.cycleTimes.filter((row) => row.project === null);
    expect(ungrouped).toHaveLength(1);
    expect(ungrouped[0]?.completed).toBe(2);
    expect(ungrouped[0]?.averageDays).toBe(4.5);
  });

  it('uses a default eight-week range and handles projects with no completions', () => {
    const model = buildReportModel(tasks, projects, { weeks: 8, now });

    expect(model.buckets).toHaveLength(8);
    expect(model.buckets[0]?.weekStart).toBe('2026-09-06');
    expect(model.buckets[7]?.weekStart).toBe('2026-10-25');
    expect(model.totalCompleted).toBe(6);
    expect(model.cycleTimes.find((row) => row.project?.id === 'project-3')?.averageDays).toBeNull();
  });

  it('returns zeroed metrics when there are no tasks', () => {
    const model = buildReportModel([], projects, { weeks: 4, now });

    expect(model.totalCompleted).toBe(0);
    expect(model.averageCompletedPerWeek).toBe(0);
    expect(model.overallAverageCycleDays).toBeNull();
    expect(model.overdueNow).toBe(0);
    expect(model.buckets.every((bucket) => bucket.completed === 0 && bucket.overdue === 0)).toBe(
      true
    );
    expect(model.cycleTimes).toHaveLength(3);
    expect(model.cycleTimes.every((row) => row.completed === 0)).toBe(true);
  });

  it('ignores invalid completion timestamps and records outside the range', () => {
    const model = buildReportModel(
      [
        makeTask({
          id: 'invalid',
          title: 'Invalid completion',
          status: 'done',
          completedAt: 'not-a-date',
        }),
        makeTask({
          id: 'negative',
          title: 'Completed before it was created',
          status: 'done',
          createdAt: '2026-10-20T00:00:00',
          completedAt: '2026-10-19T00:00:00',
        }),
      ],
      projects,
      { weeks: 4, now }
    );

    expect(model.buckets.reduce((total, bucket) => total + bucket.completed, 0)).toBe(0);
    expect(model.overallAverageCycleDays).toBeNull();
    expect(model.totalCompleted).toBe(0);
  });

  it.each<ReportWeeks>([4, 8, 12])('supports the %i-week selector', (weeks) => {
    const model = buildReportModel(tasks, projects, { weeks, now });
    expect(model.weeks).toBe(weeks);
    expect(model.buckets).toHaveLength(weeks);
    expect(model.buckets.at(-1)?.weekStart).toBe('2026-10-25');
  });
});
