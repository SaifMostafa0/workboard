import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ToastProvider, useToastHelpers } from '../Toast';

function ToastTrigger() {
  const { success, error } = useToastHelpers();

  return (
    <div>
      <button type="button" onClick={() => success('Task created')}>
        Show success
      </button>
      <button type="button" onClick={() => error('Save failed')}>
        Show error
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <ToastProvider>
      <ToastTrigger />
    </ToastProvider>
  );
}

describe('ToastProvider', () => {
  it('announces a success toast politely via a status role', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole('button', { name: 'Show success' }));

    const toast = await screen.findByRole('status');
    expect(toast).toHaveTextContent('Task created');
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  it('announces an error toast assertively via an alert role', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole('button', { name: 'Show error' }));

    const toast = await screen.findByRole('alert');
    expect(toast).toHaveTextContent('Save failed');
    expect(toast).toHaveAttribute('aria-live', 'assertive');
  });

  it('can be dismissed by the user', async () => {
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByRole('button', { name: 'Show success' }));
    expect(await screen.findByRole('status')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Dismiss notification' }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
