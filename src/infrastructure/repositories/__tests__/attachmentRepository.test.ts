import type { AttachmentMetadata } from '@/domain/attachment';
import { MAX_ATTACHMENT_BYTES } from '@/domain/attachment';
import { createStorageError } from '@/domain/errors';
import { createFakeAttachmentStore } from '@/test/factories/fakeAttachmentStore';
import { beforeEach, describe, expect, it } from 'vitest';
import { LocalAttachmentRepository } from '../attachmentRepository';

const TASK_ID = '123e4567-e89b-42d3-a456-426614174000';
const OTHER_TASK_ID = '123e4567-e89b-42d3-a456-426614174001';

const metadata = (overrides: Partial<AttachmentMetadata> = {}): AttachmentMetadata => ({
  id: '123e4567-e89b-42d3-a456-426614174002',
  name: 'notes.txt',
  type: 'text/plain',
  size: 5,
  createdAt: '2026-10-28T10:00:00.000Z',
  ...overrides,
});

describe('LocalAttachmentRepository', () => {
  let store: ReturnType<typeof createFakeAttachmentStore>;
  let repo: LocalAttachmentRepository;

  beforeEach(() => {
    store = createFakeAttachmentStore();
    repo = new LocalAttachmentRepository(store);
  });

  describe('put', () => {
    it('stores a blob and returns the validated metadata', async () => {
      const meta = metadata();
      const result = await repo.put(TASK_ID, meta, new Blob(['hello'], { type: 'text/plain' }));

      expect(result.ok).toBe(true);
      expect(store.size).toBe(1);

      const blob = await repo.getBlob(TASK_ID, meta.id);
      expect(blob.ok).toBe(true);
      if (blob.ok) {
        expect(blob.value.size).toBe(5);
        expect(blob.value.type).toBe('text/plain');
      }
    });

    it('rejects invalid metadata', async () => {
      const result = await repo.put(
        TASK_ID,
        metadata({ name: '' }),
        new Blob(['hello'], { type: 'text/plain' })
      );

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.type).toBe('VALIDATION_ERROR');
      expect(store.size).toBe(0);
    });

    it('rejects a blob whose size does not match the metadata', async () => {
      const result = await repo.put(TASK_ID, metadata({ size: 99 }), new Blob(['hello']));

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.type).toBe('VALIDATION_ERROR');
      expect(store.size).toBe(0);
    });

    it('rejects blobs above the per-file limit', async () => {
      // Metadata stays schema-valid; the blob itself is oversized.
      const oversized = new Blob([new Uint8Array(MAX_ATTACHMENT_BYTES + 1)]);

      const result = await repo.put(TASK_ID, metadata({ size: MAX_ATTACHMENT_BYTES }), oversized);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.type).toBe('QUOTA_EXCEEDED');
      expect(store.size).toBe(0);
    });

    it('propagates storage failures', async () => {
      store.setFailMode(createStorageError('QUOTA_EXCEEDED', 'Full'));

      const result = await repo.put(TASK_ID, metadata(), new Blob(['hello']));

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.type).toBe('QUOTA_EXCEEDED');
    });
  });

  describe('getBlob', () => {
    it('returns NOT_FOUND for a missing blob', async () => {
      const result = await repo.getBlob(TASK_ID, 'missing');

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.type).toBe('NOT_FOUND');
    });
  });

  describe('remove', () => {
    it('deletes a single attachment', async () => {
      await repo.put(TASK_ID, metadata(), new Blob(['hello']));

      const result = await repo.remove(TASK_ID, metadata().id);

      expect(result.ok).toBe(true);
      expect(store.size).toBe(0);
    });
  });

  describe('removeForTask', () => {
    it('deletes only the given task’s attachments', async () => {
      await repo.put(TASK_ID, metadata(), new Blob(['hello']));
      await repo.put(
        OTHER_TASK_ID,
        metadata({ id: '123e4567-e89b-42d3-a456-426614174003' }),
        new Blob(['world'])
      );

      const result = await repo.removeForTask(TASK_ID);

      expect(result.ok).toBe(true);
      expect(store.size).toBe(1);
      expect(store.has(`workboard:attachments:${TASK_ID}:${metadata().id}`)).toBe(false);
    });
  });

  describe('clearAll', () => {
    it('deletes every stored blob', async () => {
      await repo.put(TASK_ID, metadata(), new Blob(['hello']));
      await repo.put(
        OTHER_TASK_ID,
        metadata({ id: '123e4567-e89b-42d3-a456-426614174003' }),
        new Blob(['world'])
      );

      const result = await repo.clearAll();

      expect(result.ok).toBe(true);
      expect(store.size).toBe(0);
    });
  });
});
