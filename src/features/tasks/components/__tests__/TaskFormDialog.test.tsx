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
});
