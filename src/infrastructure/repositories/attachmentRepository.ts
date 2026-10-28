import type { AttachmentMetadata } from '@/domain/attachment';
import { MAX_ATTACHMENT_BYTES } from '@/domain/attachment';
import type { DomainError } from '@/domain/errors';
import { createNotFoundError, createStorageError, createValidationError } from '@/domain/errors';
import { attachmentMetadataSchema } from '@/domain/validation';
import type { AttachmentStore, Result } from '@/infrastructure/storage/storageAdapter';
import { createCollectionPrefix, err, ok } from '@/infrastructure/storage/storageAdapter';

const ATTACHMENT_PREFIX = createCollectionPrefix('attachments');

const storageKey = (taskId: string, attachmentId: string): string =>
  `${ATTACHMENT_PREFIX}${taskId}:${attachmentId}`;

const taskPrefix = (taskId: string): string => `${ATTACHMENT_PREFIX}${taskId}:`;

export interface IAttachmentRepository {
  put(
    taskId: string,
    metadata: AttachmentMetadata,
    blob: Blob
  ): Promise<Result<AttachmentMetadata, DomainError>>;
  getBlob(taskId: string, attachmentId: string): Promise<Result<Blob, DomainError>>;
  remove(taskId: string, attachmentId: string): Promise<Result<void, DomainError>>;
  removeForTask(taskId: string): Promise<Result<void, DomainError>>;
  clearAll(): Promise<Result<void, DomainError>>;
}

export class LocalAttachmentRepository implements IAttachmentRepository {
  constructor(private readonly store: AttachmentStore) {}

  async put(
    taskId: string,
    metadata: AttachmentMetadata,
    blob: Blob
  ): Promise<Result<AttachmentMetadata, DomainError>> {
    const validation = attachmentMetadataSchema.safeParse(metadata);
    if (!validation.success) {
      return err(
        createValidationError(
          validation.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          }))
        )
      );
    }
    if (blob.size > MAX_ATTACHMENT_BYTES || validation.data.size > MAX_ATTACHMENT_BYTES) {
      return err(
        createStorageError('QUOTA_EXCEEDED', 'The file exceeds the 5 MB attachment limit', {
          key: metadata.id,
        })
      );
    }
    if (blob.size !== validation.data.size) {
      return err(
        createValidationError([
          {
            field: 'size',
            message: 'Attachment size does not match the stored file',
            code: 'attachment_size_mismatch',
          },
        ])
      );
    }

    const result = await this.store.put(storageKey(taskId, metadata.id), blob);
    if (!result.ok) return err(result.error);
    return ok(validation.data);
  }

  async getBlob(taskId: string, attachmentId: string): Promise<Result<Blob, DomainError>> {
    const result = await this.store.get(storageKey(taskId, attachmentId));
    if (!result.ok) return err(result.error);
    if (!result.value) return err(createNotFoundError('Attachment', attachmentId));
    return ok(result.value);
  }

  async remove(taskId: string, attachmentId: string): Promise<Result<void, DomainError>> {
    const result = await this.store.delete(storageKey(taskId, attachmentId));
    return result.ok ? ok(undefined) : err(result.error);
  }

  async removeForTask(taskId: string): Promise<Result<void, DomainError>> {
    const result = await this.store.deleteByPrefix(taskPrefix(taskId));
    return result.ok ? ok(undefined) : err(result.error);
  }

  async clearAll(): Promise<Result<void, DomainError>> {
    const result = await this.store.clear();
    return result.ok ? ok(undefined) : err(result.error);
  }
}

export const createAttachmentRepository = (store: AttachmentStore): IAttachmentRepository =>
  new LocalAttachmentRepository(store);
