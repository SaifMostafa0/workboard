import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from '../Dialog';

describe('Dialog', () => {
  it('renders its title and content when open', () => {
    render(
      <Dialog open onClose={vi.fn()} title="Edit task">
        <p>Dialog body</p>
      </Dialog>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Edit task' })).toBeInTheDocument();
    expect(screen.getByText('Dialog body')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(
      <Dialog open={false} onClose={vi.fn()} title="Hidden">
        <p>Dialog body</p>
      </Dialog>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Dialog open onClose={onClose} title="Dismissable">
        <p>Dialog body</p>
      </Dialog>
    );

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <Dialog open onClose={onClose} title="Dismissable">
        <p>Dialog body</p>
      </Dialog>
    );

    await user.click(screen.getByRole('button', { name: 'Close dialog' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
