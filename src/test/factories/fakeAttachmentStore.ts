import type { StorageError } from '@/domain/errors';
import type { AttachmentStore, Result } from '@/infrastructure/storage/storageAdapter';
import { err, ok } from '@/infrastructure/storage/storageAdapter';

/** In-memory `AttachmentStore` for repository tests. */
export class FakeAttachmentStore implements AttachmentStore {
  private store = new Map<string, Blob>();
  private failError: StorageError | null = null;

  setFailMode(error: StorageError): void {
    this.failError = error;
  }

  async put(key: string, blob: Blob): Promise<Result<void, StorageError>> {
    if (this.failError) return err(this.failError);
    this.store.set(key, blob);
    return ok(undefined);
  }

  async get(key: string): Promise<Result<Blob | null, StorageError>> {
    if (this.failError) return err(this.failError);
    return ok(this.store.get(key) ?? null);
  }

  async delete(key: string): Promise<Result<void, StorageError>> {
    if (this.failError) return err(this.failError);
    this.store.delete(key);
    return ok(undefined);
  }

  async deleteByPrefix(prefix: string): Promise<Result<void, StorageError>> {
    if (this.failError) return err(this.failError);
    for (const key of [...this.store.keys()]) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
    return ok(undefined);
  }

  async clear(): Promise<Result<void, StorageError>> {
    if (this.failError) return err(this.failError);
    this.store.clear();
    return ok(undefined);
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  get size(): number {
    return this.store.size;
  }
}

export const createFakeAttachmentStore = (): FakeAttachmentStore => new FakeAttachmentStore();
