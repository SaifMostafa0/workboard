import type { StorageError } from '@/domain/errors';
import type { Result, StorageAdapter } from '@/infrastructure/storage/storageAdapter';
import { err, ok } from '@/infrastructure/storage/storageAdapter';

// Fake in-memory storage adapter for testing
export class FakeStorageAdapter implements StorageAdapter {
  private store = new Map<string, unknown>();
  private shouldFail = false;
  private failOperation: string | null = null;
  private failError: StorageError | null = null;

  constructor(initialData: Record<string, unknown> = {}) {
    Object.entries(initialData).forEach(([key, value]) => {
      this.store.set(key, value);
    });
  }

  setFailMode(operation: string, error: StorageError) {
    this.shouldFail = true;
    this.failOperation = operation;
    this.failError = error;
  }

  clearFailMode() {
    this.shouldFail = false;
    this.failOperation = null;
    this.failError = null;
  }

  async get<T>(key: string): Promise<Result<T | null, StorageError>> {
    if (this.shouldFail && this.failOperation === 'get') {
      return err(this.failError!);
    }
    const value = this.store.get(key);
    return ok((value as T) ?? null);
  }

  async set<T>(key: string, value: T): Promise<Result<void, StorageError>> {
    if (this.shouldFail && this.failOperation === 'set') {
      return err(this.failError!);
    }
    this.store.set(key, value);
    return ok(undefined);
  }

  async delete(key: string): Promise<Result<void, StorageError>> {
    if (this.shouldFail && this.failOperation === 'delete') {
      return err(this.failError!);
    }
    this.store.delete(key);
    return ok(undefined);
  }

  async getAll<T>(prefix: string): Promise<Result<T[], StorageError>> {
    if (this.shouldFail && this.failOperation === 'getAll') {
      return err(this.failError!);
    }
    const results: T[] = [];
    for (const [key, value] of this.store.entries()) {
      if (key.startsWith(prefix)) {
        results.push(value as T);
      }
    }
    return ok(results);
  }

  async clear(prefix?: string): Promise<Result<void, StorageError>> {
    if (this.shouldFail && this.failOperation === 'clear') {
      return err(this.failError!);
    }
    if (prefix) {
      const keysToDelete: string[] = [];
      for (const key of this.store.keys()) {
        if (key.startsWith(prefix)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach((key) => this.store.delete(key));
    } else {
      this.store.clear();
    }
    return ok(undefined);
  }

  async getKeys(prefix: string): Promise<Result<string[], StorageError>> {
    if (this.shouldFail && this.failOperation === 'getKeys') {
      return err(this.failError!);
    }
    const keys: string[] = [];
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        keys.push(key);
      }
    }
    return ok(keys);
  }

  // Test helpers
  getStoreSize(): number {
    return this.store.size;
  }

  hasKey(key: string): boolean {
    return this.store.has(key);
  }

  getValue(key: string): unknown {
    return this.store.get(key);
  }
}

export const createFakeAdapter = (initialData?: Record<string, unknown>) => {
  return new FakeStorageAdapter(initialData);
};
