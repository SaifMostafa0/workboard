import type { StorageError } from '@/domain/errors';
import { createStorageError } from '@/domain/errors';

export interface StorageAdapter {
  get<T>(key: string): Promise<Result<T | null, StorageError>>;
  set<T>(key: string, value: T): Promise<Result<void, StorageError>>;
  delete(key: string): Promise<Result<void, StorageError>>;
  getAll<T>(prefix: string): Promise<Result<T[], StorageError>>;
  clear(prefix?: string): Promise<Result<void, StorageError>>;
  getKeys(prefix: string): Promise<Result<string[], StorageError>>;
}

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export const isOk = <T, E>(result: Result<T, E>): result is { ok: true; value: T } => result.ok;
export const isErr = <T, E>(result: Result<T, E>): result is { ok: false; error: E } => !result.ok;

export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (result.ok) return result.value;
  throw result.error;
};

export const unwrapErr = <T, E>(result: Result<T, E>): E => {
  if (!result.ok) return result.error;
  throw new Error('Expected error but got ok result');
};

export const mapResult = <T, E, U>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> => {
  if (result.ok) return ok(fn(result.value));
  return result;
};

export const flatMapResult = <T, E, U>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> => {
  if (result.ok) return fn(result.value);
  return result;
};

/** Prefix shared by every key the app writes, e.g. `workboard:projects:<id>`. */
export const STORAGE_PREFIX = 'workboard:';

export const createStorageKey = (collection: string, id: string): string => {
  return `${STORAGE_PREFIX}${collection}:${id}`;
};

export const createCollectionPrefix = (collection: string): string => {
  return `${STORAGE_PREFIX}${collection}:`;
};

export const parseStorageKey = (key: string): { collection: string; id: string } | null => {
  const prefix = STORAGE_PREFIX;
  if (!key.startsWith(prefix)) return null;
  const rest = key.slice(prefix.length);
  const colonIndex = rest.indexOf(':');
  if (colonIndex === -1) return null;
  return {
    collection: rest.slice(0, colonIndex),
    id: rest.slice(colonIndex + 1),
  };
};

export const handleStorageError = (
  operation: string,
  error: unknown,
  key?: string
): StorageError => {
  if (error instanceof DOMException) {
    if (error.name === 'QuotaExceededError') {
      return createStorageError('QUOTA_EXCEEDED', `Storage quota exceeded during ${operation}`, {
        key,
      });
    }
    if (error.name === 'SecurityError') {
      return createStorageError(
        'PERMISSION_DENIED',
        `Storage permission denied during ${operation}`,
        { key }
      );
    }
  }
  if (error instanceof Error) {
    if (error.message.includes('quota') || error.message.includes('Quota')) {
      return createStorageError('QUOTA_EXCEEDED', `Storage quota exceeded during ${operation}`, {
        key,
        cause: error,
      });
    }
  }
  return createStorageError('CORRUPTED_DATA', `Storage error during ${operation}: ${error}`, {
    key,
    cause: error as Error,
  });
};
