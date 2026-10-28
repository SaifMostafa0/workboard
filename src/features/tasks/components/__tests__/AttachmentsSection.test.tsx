import type { AttachmentMetadata } from '@/domain/attachment';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AttachmentsSection } from '../AttachmentsSection';

const mocks = vi.hoisted(() => ({
  useAddAttachment: vi.fn(),
  useRemoveAttachment: vi.fn(),
  downloadTaskAttachment: vi.fn(),
}));

vi.mock('@/hooks/useData', () => ({
  useAddAttachment: mocks.useAddAttachment,
  useRemoveAttachment: mocks.useRemoveAttachment,
  downloadTaskAttachment: mocks.downloadTaskAttachment,
}));

const TASK_ID = '123e4567-e89b-42d3-a456-426614174000';

const attachment = (overrides: Partial<AttachmentMetadata> = {}): AttachmentMetadata => ({
  id: '123e4567-e89b-42d3-a456-426614174002',
  name: 'notes.txt',
  type: 'text/plain',
  size: 2048,
  createdAt: '2026-10-28T10:00:00.000Z',
  ...overrides,
});

describe('AttachmentsSection', () => {
  const addAttachment = vi.fn();
  const removeAttachment = vi.fn();

  beforeEach(() => {
    addAttachment.mockReset();
    removeAttachment.mockReset();
    mocks.downloadTaskAttachment.mockReset();
    addAttachment.mockResolvedValue(undefined);
    mocks.downloadTaskAttachment.mockResolvedValue({ ok: true });
    mocks.useAddAttachment.mockReturnValue({ mutateAsync: addAttachment, isPending: false });
    mocks.useRemoveAttachment.mockReturnValue({ mutate: removeAttachment, isPending: false });
  });

  it('shows an empty state and the local-only storage note', () => {
    render(<AttachmentsSection taskId={TASK_ID} attachments={[]} />);

    expect(screen.getByText('No files attached yet.')).toBeInTheDocument();
    expect(
      screen.getByText(/Exports and encrypted backups never include file contents/i)
    ).toBeInTheDocument();
    expect(screen.getByText('0 / 10')).toBeInTheDocument();
  });

  it('lists attachments with a readable size', () => {
    render(<AttachmentsSection taskId={TASK_ID} attachments={[attachment()]} />);

    expect(screen.getByText('notes.txt')).toBeInTheDocument();
    expect(screen.getByText('2 KB')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download notes.txt' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove notes.txt' })).toBeInTheDocument();
  });

  it('adds files chosen with the picker', async () => {
    const user = userEvent.setup();
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });

    render(<AttachmentsSection taskId={TASK_ID} attachments={[]} />);
    await user.upload(screen.getByLabelText('Choose files'), file);

    await waitFor(() => expect(addAttachment).toHaveBeenCalledWith(file));
  });

  it('adds files dropped onto the dropzone', async () => {
    const file = new File(['hello'], 'dropped.txt', { type: 'text/plain' });

    render(<AttachmentsSection taskId={TASK_ID} attachments={[]} />);
    const dropzone = screen.getByTestId('attachment-dropzone');

    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    await waitFor(() => expect(addAttachment).toHaveBeenCalledWith(file));
  });

  it('surfaces an error when a file cannot be added', async () => {
    const user = userEvent.setup();
    addAttachment.mockRejectedValue(new Error('This task has reached its 25 MB attachment limit'));

    render(<AttachmentsSection taskId={TASK_ID} attachments={[]} />);
    await user.upload(
      screen.getByLabelText('Choose files'),
      new File(['x'], 'big.bin', { type: 'application/octet-stream' })
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(/25 MB attachment limit/i);
  });

  it('removes an attachment', async () => {
    const user = userEvent.setup();
    const existing = attachment();

    render(<AttachmentsSection taskId={TASK_ID} attachments={[existing]} />);
    await user.click(screen.getByRole('button', { name: 'Remove notes.txt' }));

    expect(removeAttachment).toHaveBeenCalledWith(existing);
  });

  it('downloads an attachment and reports download failures', async () => {
    const user = userEvent.setup();
    const existing = attachment();

    render(<AttachmentsSection taskId={TASK_ID} attachments={[existing]} />);
    await user.click(screen.getByRole('button', { name: 'Download notes.txt' }));

    expect(mocks.downloadTaskAttachment).toHaveBeenCalledWith(TASK_ID, existing);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    mocks.downloadTaskAttachment.mockResolvedValue({
      ok: false,
      message: 'Attachment not found: 1',
    });
    await user.click(screen.getByRole('button', { name: 'Download notes.txt' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Attachment not found/i);
  });
});
