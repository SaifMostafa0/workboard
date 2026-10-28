import { describe, expect, it } from 'vitest';
import { describeReminder, getReminderCandidates } from '../reminder';
import type { Task } from '../task';

const NOW = new Date(2026, 9, 28, 12, 0, 0); // 28 Oct 2026, local noon

let taskCounter = 0;

const makeTask = (overrides: Partial<Task> = {}): Task => {
  taskCounter += 1;
  const suffix = taskCounter.toString().padStart(12, '0');
  return {
    id: `123e4567-e89b-42d3-a456-${suffix}`,
    projectId: '123e4567-e89b-42d3-a456-426614174000',
    title: `Task ${taskCounter}`,
    description: '',
    status: 'todo',
    priority: 'medium',
    tags: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
};

describe('getReminderCandidates', () => {
  it('includes overdue, due-today and upcoming tasks within the lead window', () => {
    const overdue = makeTask({ dueDate: '2026-10-25' });
    const today = makeTask({ dueDate: '2026-10-28' });
    const upcoming = makeTask({ dueDate: '2026-10-30' });
    const edge = makeTask({ dueDate: '2026-11-01' });
    const tooFar = makeTask({ dueDate: '2026-11-05' });

    const candidates = getReminderCandidates([overdue, today, upcoming, edge, tooFar], {
      leadDays: 4,
      now: NOW,
    });

    expect(candidates.map((candidate) => candidate.task.id)).toEqual([
      overdue.id,
      today.id,
      upcoming.id,
      edge.id,
    ]);
    expect(candidates.map((candidate) => candidate.kind)).toEqual([
      'overdue',
      'today',
      'upcoming',
      'upcoming',
    ]);
    expect(candidates.map((candidate) => candidate.daysUntilDue)).toEqual([-3, 0, 2, 4]);
  });

  it('excludes completed, deleted, undated and malformed tasks', () => {
    const tasks = [
      makeTask({ dueDate: '2026-10-28', status: 'done' }),
      makeTask({ dueDate: '2026-10-28', deletedAt: '2026-10-27T00:00:00.000Z' }),
      makeTask(),
      makeTask({ dueDate: '28/10/2026' }),
      makeTask({ dueDate: '2026-10-28' }),
    ];

    const candidates = getReminderCandidates(tasks, { leadDays: 1, now: NOW });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.task.id).toBe(tasks[4]?.id);
  });

  it('treats a lead time of zero as due-today only', () => {
    const tasks = [makeTask({ dueDate: '2026-10-29' }), makeTask({ dueDate: '2026-10-28' })];

    const candidates = getReminderCandidates(tasks, { leadDays: 0, now: NOW });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.kind).toBe('today');
  });

  it('clamps negative lead times instead of failing', () => {
    const tasks = [makeTask({ dueDate: '2026-10-30' }), makeTask({ dueDate: '2026-10-20' })];

    const candidates = getReminderCandidates(tasks, { leadDays: -5, now: NOW });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.kind).toBe('overdue');
  });

  it('sorts by due date, then by priority', () => {
    const low = makeTask({ dueDate: '2026-10-29', priority: 'low' });
    const urgent = makeTask({ dueDate: '2026-10-29', priority: 'urgent' });
    const earliest = makeTask({ dueDate: '2026-10-20', priority: 'low' });

    const candidates = getReminderCandidates([low, urgent, earliest], {
      leadDays: 3,
      now: NOW,
    });

    expect(candidates.map((candidate) => candidate.task.id)).toEqual([
      earliest.id,
      urgent.id,
      low.id,
    ]);
  });

  it('builds a stable key from the task, due date and reminder kind', () => {
    const task = makeTask({ dueDate: '2026-10-28' });

    const [candidate] = getReminderCandidates([task], { leadDays: 1, now: NOW });

    expect(candidate?.key).toBe(`${task.id}:2026-10-28:today`);
  });
});

describe('describeReminder', () => {
  const candidate = (daysUntilDue: number, kind: 'overdue' | 'today' | 'upcoming') => ({
    task: makeTask(),
    dueDate: '2026-10-28',
    daysUntilDue,
    kind,
    key: 'key',
  });

  it('describes overdue tasks with singular and plural days', () => {
    expect(describeReminder(candidate(-1, 'overdue'))).toBe('Overdue by 1 day');
    expect(describeReminder(candidate(-6, 'overdue'))).toBe('Overdue by 6 days');
  });

  it('describes tasks due today', () => {
    expect(describeReminder(candidate(0, 'today'))).toBe('Due today');
  });

  it('describes upcoming tasks', () => {
    expect(describeReminder(candidate(1, 'upcoming'))).toBe('Due tomorrow');
    expect(describeReminder(candidate(4, 'upcoming'))).toBe('Due in 4 days');
  });
});
