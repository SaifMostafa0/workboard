import { createStorageError } from '@/domain/errors';
import type { AttachmentStore } from './storageAdapter';
import { err, ok } from './storageAdapter';

/**
 * localStorage cannot store blobs without base64 bloat and a hard ~5 MB total,
 * so attachment support degrades explicitly when IndexedDB is unavailable.
 */
export const unsupportedAttachmentStore: AttachmentStore = {
  async put(key) {
    return err(
      createStorageError(
        'UNSUPPORTED_OPERATION',
        'Attachments require IndexedDB, which is not available in this browser',
        { key }
      )
    );
  },
  async get(key) {
    return err(
      createStorageError(
        'UNSUPPORTED_OPERATION',
        'Attachments require IndexedDB, which is not available in this browser',
        { key }
      )
    );
  },
  async delete(key) {
    return err(
      createStorageError(
        'UNSUPPORTED_OPERATION',
        'Attachments require IndexedDB, which is not available in this browser',
        { key }
      )
    );
  },
  async deleteByPrefix() {
    return ok(undefined);
  },
  async clear() {
    return ok(undefined);
  },
};
