import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskFormDialog } from '../TaskFormDialog';

const PROJECT_ID = '123e4567-e89b-42d3-a456-426614174000';

function renderDialog(overrides: Partial<Parameters<typeof TaskFormDialog>[0]> = {}) {
  const onClose = vi.fn();
  const onSubmit = vi.fn();

  render(
    <TaskFormDialog
      open
      onClose={onClose}
      projectId={PROJECT_ID}
      isLoading={false}
      onSubmit={onSubmit}
      {...overrides}
    />
  );

  return { onClose, onSubmit };
}

describe('TaskFormDialog', () => {
  it('shows a validation error and does not submit when the title is empty', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Create Task' }));

    expect(await screen.findByText('Task title is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the entered task details', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog();

    await user.type(screen.getByLabelText(/Title/), 'Write the release notes');
    await user.click(screen.getByRole('button', { name: 'Create Task' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    // react-hook-form invokes the submit handler with (data, event).
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Write the release notes',
        projectId: PROJECT_ID,
      }),
      expect.anything()
    );
  });

  it('closes without submitting when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const { onClose, onSubmit } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('assigns the task to a selected epic', async () => {
    const user = userEvent.setup();
    const epicId = '123e4567-e89b-42d3-a456-426614174030';
    const { onSubmit } = renderDialog({ epics: [{ id: epicId, name: 'Authentication' }] });

    await user.type(screen.getByLabelText(/Title/), 'Add password reset');
    await user.selectOptions(screen.getByLabelText(/Epic/), epicId);
    await user.click(screen.getByRole('button', { name: 'Create Task' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Add password reset', epicId }),
      expect.anything()
    );
  });

  it('submits without an epic when none is chosen', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog({ epics: [{ id: 'e1', name: 'Authentication' }] });

    await user.type(screen.getByLabelText(/Title/), 'Unassigned task');
    await user.click(screen.getByRole('button', { name: 'Create Task' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Unassigned task', epicId: undefined }),
      expect.anything()
    );
  });

  const BLOCKER_ID = '123e4567-e89b-42d3-a456-4266141740a1';

  it('adds a blocker and submits it', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog({
      blockerOptions: [{ id: BLOCKER_ID, title: 'Design review', status: 'todo', blockedBy: [] }],
    });

    await user.type(screen.getByLabelText(/Title/), 'Ship the feature');
    await user.selectOptions(screen.getByLabelText('Add a blocking task'), BLOCKER_ID);
    await user.click(screen.getByRole('button', { name: 'Create Task' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ blockedBy: [BLOCKER_ID] }),
      expect.anything()
    );
  });

  it('removes a blocker from the chip list', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog({
      blockerOptions: [{ id: BLOCKER_ID, title: 'Design review', status: 'todo', blockedBy: [] }],
    });

    await user.type(screen.getByLabelText(/Title/), 'Ship the feature');
    await user.selectOptions(screen.getByLabelText('Add a blocking task'), BLOCKER_ID);
    await user.click(screen.getByRole('button', { name: 'Remove blocker Design review' }));
    await user.click(screen.getByRole('button', { name: 'Create Task' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ blockedBy: [] }),
      expect.anything()
    );
  });

  it('excludes itself and cycle-forming tasks from the blocker options', () => {
    const taskId = '123e4567-e89b-42d3-a456-4266141740b1';
    const cyclicId = '123e4567-e89b-42d3-a456-4266141740b2';
    const freeId = '123e4567-e89b-42d3-a456-4266141740b3';
    renderDialog({
      taskId,
      blockerOptions: [
        { id: taskId, title: 'This task', status: 'todo', blockedBy: [] },
        { id: cyclicId, title: 'Depends on this task', status: 'todo', blockedBy: [taskId] },
        { id: freeId, title: 'Independent task', status: 'todo', blockedBy: [] },
      ],
    });

    const select = screen.getByLabelText('Add a blocking task') as HTMLSelectElement;
    const values = [...select.options].map((option) => option.value);

    expect(values).toContain(freeId);
    expect(values).not.toContain(taskId);
    expect(values).not.toContain(cyclicId);
  });
});
