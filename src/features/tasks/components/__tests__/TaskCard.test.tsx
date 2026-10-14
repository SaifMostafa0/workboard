import type { TaskPriority, TaskStatus } from '@/domain/task';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { TaskCard } from '../TaskCard';

const baseTask = {
  id: 'task-1',
  title: 'Design the homepage hero',
  description: 'Explore a few directions',
  status: 'in_progress' as TaskStatus,
  priority: 'high' as TaskPriority,
  dueDate: undefined,
  assignee: 'Maya',
  tags: ['design', 'frontend'],
  updatedAt: new Date().toISOString(),
};

function renderCard(overrides: Partial<Parameters<typeof TaskCard>[0]> = {}) {
  const onStatusChange = vi.fn();
  const onEdit = vi.fn();
  const onDelete = vi.fn();

  render(
    <MemoryRouter>
      <TaskCard
        task={baseTask}
        onStatusChange={onStatusChange}
        onEdit={onEdit}
        onDelete={onDelete}
        {...overrides}
      />
    </MemoryRouter>
  );

  return { onStatusChange, onEdit, onDelete };
}

describe('TaskCard', () => {
  it('renders the title, status, priority, assignee and tags', () => {
    renderCard();

    expect(screen.getByRole('heading', { name: 'Design the homepage hero' })).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Maya')).toBeInTheDocument();
    expect(screen.getByText('design')).toBeInTheDocument();
  });

  it('calls onEdit with the task when the edit button is clicked', async () => {
    const user = userEvent.setup();
    const { onEdit } = renderCard();

    await user.click(screen.getByRole('button', { name: 'Edit Design the homepage hero' }));

    expect(onEdit).toHaveBeenCalledWith({ id: 'task-1' });
  });

  it('calls onDelete with the id and title when the delete button is clicked', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderCard();

    await user.click(screen.getByRole('button', { name: 'Delete Design the homepage hero' }));

    expect(onDelete).toHaveBeenCalledWith('task-1', 'Design the homepage hero');
  });

  it('completes an in-progress task via the status action', async () => {
    const user = userEvent.setup();
    const { onStatusChange } = renderCard();

    await user.click(screen.getByRole('button', { name: /Complete/ }));

    expect(onStatusChange).toHaveBeenCalledWith('task-1', 'done');
  });

  it('does not render status actions for a completed task', () => {
    renderCard({ task: { ...baseTask, status: 'done' } });

    expect(screen.queryByRole('button', { name: /Complete|Start/ })).not.toBeInTheDocument();
  });

  it('shows a Sub-task badge for a sub-task', () => {
    renderCard({ task: { ...baseTask, parentId: 'parent-1' } });

    expect(screen.getByText('Sub-task')).toBeInTheDocument();
  });

  it('shows done/total progress for a task with sub-tasks', () => {
    renderCard({ subtaskProgress: { done: 2, total: 3 } });

    expect(screen.getByText('2/3')).toBeInTheDocument();
  });

  it('hides the progress badge when there are no sub-tasks', () => {
    renderCard({ subtaskProgress: { done: 0, total: 0 } });

    expect(screen.queryByText('0/0')).not.toBeInTheDocument();
  });

  it('renders an Add sub-task action for top-level tasks', async () => {
    const user = userEvent.setup();
    const onAddSubtask = vi.fn();
    renderCard({ onAddSubtask });

    await user.click(
      screen.getByRole('button', { name: 'Add sub-task to Design the homepage hero' })
    );

    expect(onAddSubtask).toHaveBeenCalledWith({ id: 'task-1' });
  });

  it('does not offer Add sub-task for a sub-task', () => {
    renderCard({ task: { ...baseTask, parentId: 'parent-1' }, onAddSubtask: vi.fn() });

    expect(
      screen.queryByRole('button', { name: 'Add sub-task to Design the homepage hero' })
    ).not.toBeInTheDocument();
  });
});
