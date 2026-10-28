import { describe, expect, it } from 'vitest';
import {
  describeActivity,
  diffTaskForActivity,
  fieldLabel,
  isTaskActivity,
  type TaskActivity,
} from '../activity';
import type { Task } from '../task';

const TASK_ID = '123e4567-e89b-42d3-a456-426614174000';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: TASK_ID,
  projectId: '123e4567-e89b-42d3-a456-426614174001',
  title: 'Ship the release',
  description: '',
  status: 'todo',
  priority: 'medium',
  dueDate: '2026-10-28',
  assignee: 'Seif',
  tags: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makeActivity = (overrides: Partial<TaskActivity> = {}): TaskActivity => ({
  id: '123e4567-e89b-42d3-a456-426614174002',
  taskId: TASK_ID,
  kind: 'task_updated',
  createdAt: '2026-10-28T10:00:00.000Z',
  ...overrides,
});

describe('diffTaskForActivity', () => {
  it('returns no changes when tracked fields are equal', () => {
    expect(diffTaskForActivity(makeTask(), makeTask())).toEqual([]);
  });

  it('records changed tracked fields with readable values', () => {
    const changes = diffTaskForActivity(
      makeTask(),
      makeTask({ status: 'done', priority: 'urgent', title: 'Ship the release today' })
    );

    expect(changes).toEqual([
      { field: 'status', from: 'todo', to: 'done' },
      { field: 'priority', from: 'medium', to: 'urgent' },
      { field: 'title', from: 'Ship the release', to: 'Ship the release today' },
    ]);
  });

  it('records cleared fields with only the previous value', () => {
    const changes = diffTaskForActivity(makeTask(), makeTask({ dueDate: undefined }));

    expect(changes).toEqual([{ field: 'dueDate', from: '2026-10-28', to: undefined }]);
  });

  it('serialises object values such as recurrence rules', () => {
    const changes = diffTaskForActivity(
      makeTask(),
      makeTask({ recurrence: { frequency: 'weekly', interval: 1 } })
    );

    expect(changes).toEqual([
      {
        field: 'recurrence',
        from: undefined,
        to: '{"frequency":"weekly","interval":1}',
      },
    ]);
  });

  it('compares recurrence rules structurally', () => {
    const changes = diffTaskForActivity(
      makeTask({ recurrence: { frequency: 'weekly', interval: 1 } }),
      makeTask({ recurrence: { frequency: 'weekly', interval: 1 } })
    );

    expect(changes).toEqual([]);
  });

  it('respects an explicit subset of fields', () => {
    const changes = diffTaskForActivity(makeTask(), makeTask({ status: 'done', title: 'New' }), [
      'status',
    ]);

    expect(changes).toEqual([{ field: 'status', from: 'todo', to: 'done' }]);
  });

  it('ignores untracked fields', () => {
    const changes = diffTaskForActivity(makeTask(), makeTask({ description: 'New description' }));

    expect(changes).toEqual([]);
  });
});

describe('fieldLabel', () => {
  it('maps tracked fields to readable labels', () => {
    expect(fieldLabel('dueDate')).toBe('due date');
    expect(fieldLabel('status')).toBe('status');
  });

  it('passes through unknown fields', () => {
    expect(fieldLabel('customField')).toBe('customField');
  });
});

describe('describeActivity', () => {
  it('describes creation, import and comments', () => {
    expect(describeActivity(makeActivity({ kind: 'task_created' }))).toBe('Created this task');
    expect(describeActivity(makeActivity({ kind: 'task_imported' }))).toBe('Imported this task');
    expect(describeActivity(makeActivity({ kind: 'comment', message: 'Hello' }))).toBe('Commented');
  });

  it('describes field updates in all shapes', () => {
    expect(describeActivity(makeActivity({ field: 'status', from: 'todo', to: 'done' }))).toBe(
      'Changed status from todo to done'
    );
    expect(describeActivity(makeActivity({ field: 'status', to: 'done' }))).toBe(
      'Set status to done'
    );
    expect(describeActivity(makeActivity({ field: 'dueDate', from: '2026-10-28' }))).toBe(
      'Cleared due date'
    );
    expect(describeActivity(makeActivity({ field: 'status' }))).toBe('Updated status');
    expect(describeActivity(makeActivity())).toBe('Updated task');
  });

  it('describes attachments and scheduled recurrences', () => {
    expect(describeActivity(makeActivity({ kind: 'attachment_added', to: 'notes.txt' }))).toBe(
      'Attached notes.txt'
    );
    expect(describeActivity(makeActivity({ kind: 'attachment_added' }))).toBe(
      'Added an attachment'
    );
    expect(describeActivity(makeActivity({ kind: 'attachment_removed', to: 'notes.txt' }))).toBe(
      'Removed attachment notes.txt'
    );
    expect(describeActivity(makeActivity({ kind: 'recurrence_scheduled', to: '2026-11-04' }))).toBe(
      'Scheduled the next occurrence for 2026-11-04'
    );
  });
});

describe('isTaskActivity', () => {
  it('accepts valid activity entries', () => {
    expect(isTaskActivity(makeActivity())).toBe(true);
  });

  it('rejects malformed or unknown entries', () => {
    expect(isTaskActivity(null)).toBe(false);
    expect(isTaskActivity({})).toBe(false);
    expect(isTaskActivity({ ...makeActivity(), kind: 'bogus' })).toBe(false);
    expect(isTaskActivity({ ...makeActivity(), createdAt: 123 })).toBe(false);
  });
});
