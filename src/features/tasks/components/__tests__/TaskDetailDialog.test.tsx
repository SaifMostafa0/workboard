import type { TaskActivity } from '@/domain/activity';
import type { Task } from '@/domain/task';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskDetailDialog } from '../TaskDetailDialog';

const mocks = vi.hoisted(() => ({
  useTask: vi.fn(),
  useTaskActivity: vi.fn(),
  useAddComment: vi.fn(),
  useUpdateTask: vi.fn(),
}));

vi.mock('@/hooks/useData', () => ({
  useTask: mocks.useTask,
  useTaskActivity: mocks.useTaskActivity,
  useAddComment: mocks.useAddComment,
  useUpdateTask: mocks.useUpdateTask,
}));

vi.mock('../AttachmentsSection', () => ({
  AttachmentsSection: () => <div data-testid="attachments" />,
}));

const TASK_ID = '123e4567-e89b-42d3-a456-426614174000';

const task = (overrides: Partial<Task> = {}): Task => ({
  id: TASK_ID,
  projectId: '123e4567-e89b-42d3-a456-426614174001',
  title: 'Ship the release',
  description: '',
  status: 'todo',
  priority: 'high',
  dueDate: '2026-10-28',
  tags: [],
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
});

const comment = (overrides: Partial<TaskActivity> = {}): TaskActivity => ({
  id: '123e4567-e89b-42d3-a456-426614174010',
  taskId: TASK_ID,
  kind: 'comment',
  message: 'Looks good to me',
  authorName: 'You',
  createdAt: '2026-10-28T10:00:00.000Z',
  ...overrides,
});

describe('TaskDetailDialog', () => {
  const addComment = vi.fn();
  const updateTask = vi.fn();

  beforeEach(() => {
    addComment.mockReset();
    updateTask.mockReset();
    addComment.mockResolvedValue(undefined);
    updateTask.mockResolvedValue(undefined);
    mocks.useTask.mockReturnValue({ data: task(), isLoading: false });
    mocks.useTaskActivity.mockReturnValue({ data: [] });
    mocks.useAddComment.mockReturnValue({ mutateAsync: addComment, isPending: false });
    mocks.useUpdateTask.mockReturnValue({ mutateAsync: updateTask, isPending: false });
  });

  it('renders empty comment and activity states', () => {
    render(<TaskDetailDialog open taskId={TASK_ID} onClose={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Comments' })).toBeInTheDocument();
    expect(screen.getByText('No comments yet. Add the first one below.')).toBeInTheDocument();
    expect(screen.getByText('No changes recorded yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('renders the comment thread as an ordered list with timestamps', () => {
    mocks.useTaskActivity.mockReturnValue({ data: [comment()] });

    render(<TaskDetailDialog open taskId={TASK_ID} onClose={vi.fn()} />);

    const thread = screen.getByRole('list');
    expect(thread.tagName).toBe('OL');
    expect(screen.getByText('Looks good to me')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
    const timestamp = within(thread).getByText((_content, element) => element?.tagName === 'TIME');
    expect(timestamp).toHaveAttribute('dateTime', comment().createdAt);
  });

  it('renders change history with readable descriptions', () => {
    mocks.useTaskActivity.mockReturnValue({
      data: [
        {
          id: '123e4567-e89b-42d3-a456-426614174011',
          taskId: TASK_ID,
          kind: 'task_updated',
          field: 'status',
          from: 'todo',
          to: 'done',
          createdAt: '2026-10-28T11:00:00.000Z',
        },
      ],
    });

    render(<TaskDetailDialog open taskId={TASK_ID} onClose={vi.fn()} />);

    expect(screen.getByText('Changed status from todo to done')).toBeInTheDocument();
    expect(screen.queryByText('No changes recorded yet.')).not.toBeInTheDocument();
  });

  it('posts a comment and clears the field', async () => {
    const user = userEvent.setup();
    render(<TaskDetailDialog open taskId={TASK_ID} onClose={vi.fn()} />);

    const field = screen.getByLabelText('Add a comment');
    await user.type(field, 'Ready to ship');
    await user.click(screen.getByRole('button', { name: 'Post comment' }));

    expect(addComment).toHaveBeenCalledWith('Ready to ship');
    await vi.waitFor(() => expect(field).toHaveValue(''));
  });

  it('disables posting for blank comments', () => {
    render(<TaskDetailDialog open taskId={TASK_ID} onClose={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Post comment' })).toBeDisabled();
  });

  it('shows the recurrence and stops the series', async () => {
    const user = userEvent.setup();
    mocks.useTask.mockReturnValue({
      data: task({ recurrence: { frequency: 'weekly', interval: 2 } }),
      isLoading: false,
    });

    render(<TaskDetailDialog open taskId={TASK_ID} onClose={vi.fn()} />);

    expect(screen.getByText(/Repeats weekly, every 2/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Stop repeating' }));

    expect(updateTask).toHaveBeenCalledWith({ id: TASK_ID, update: { recurrence: undefined } });
  });

  it('shows a loading state until the task arrives', () => {
    mocks.useTask.mockReturnValue({ data: undefined, isLoading: true });

    render(<TaskDetailDialog open taskId={TASK_ID} onClose={vi.fn()} />);

    expect(screen.getByText('Loading task…')).toBeInTheDocument();
  });
});
