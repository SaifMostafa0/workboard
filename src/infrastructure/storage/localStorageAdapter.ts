import { createStorageError, type StorageError } from '@/domain/errors';
import { shouldFailWrites } from './failureInjection';
import type { Result, StorageAdapter } from './storageAdapter';
import { STORAGE_PREFIX, err, handleStorageError, ok } from './storageAdapter';

const isLocalStorageAvailable = (): boolean => {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

const parseJSON = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const localStorageAdapter: StorageAdapter = {
  async get<T>(key: string): Promise<Result<T | null, StorageError>> {
    try {
      if (!isLocalStorageAvailable()) {
        return err({ type: 'UNSUPPORTED_OPERATION', message: 'localStorage not available', key });
      }
      const value = localStorage.getItem(key);
      return ok(parseJSON<T>(value));
    } catch (error) {
      return err(handleStorageError('get', error, key));
    }
  },

  async set<T>(key: string, value: T): Promise<Result<void, StorageError>> {
    if (shouldFailWrites()) {
      return err(createStorageError('QUOTA_EXCEEDED', 'Injected storage write failure', { key }));
    }
    try {
      if (!isLocalStorageAvailable()) {
        return err({ type: 'UNSUPPORTED_OPERATION', message: 'localStorage not available', key });
      }
      localStorage.setItem(key, JSON.stringify(value));
      return ok(undefined);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        return err({ type: 'QUOTA_EXCEEDED', message: 'localStorage quota exceeded', key });
      }
      return err(handleStorageError('set', error, key));
    }
  },

  async delete(key: string): Promise<Result<void, StorageError>> {
    if (shouldFailWrites()) {
      return err(createStorageError('QUOTA_EXCEEDED', 'Injected storage delete failure', { key }));
    }
    try {
      if (!isLocalStorageAvailable()) {
        return err({ type: 'UNSUPPORTED_OPERATION', message: 'localStorage not available', key });
      }
      localStorage.removeItem(key);
      return ok(undefined);
    } catch (error) {
      return err(handleStorageError('delete', error, key));
    }
  },

  async getAll<T>(prefix: string): Promise<Result<T[], StorageError>> {
    try {
      if (!isLocalStorageAvailable()) {
        return err({
          type: 'UNSUPPORTED_OPERATION',
          message: 'localStorage not available',
          key: prefix,
        });
      }
      const results: T[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const value = parseJSON<T>(localStorage.getItem(key));
          if (value !== null) results.push(value);
        }
      }
      return ok(results);
    } catch (error) {
      return err(handleStorageError('getAll', error, prefix));
    }
  },

  async clear(prefix?: string): Promise<Result<void, StorageError>> {
    try {
      if (!isLocalStorageAvailable()) {
        return err({
          type: 'UNSUPPORTED_OPERATION',
          message: 'localStorage not available',
          key: prefix,
        });
      }
      if (prefix) {
        const keysToDelete: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach((key) => localStorage.removeItem(key));
      } else {
        const workboardKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(STORAGE_PREFIX)) {
            workboardKeys.push(key);
          }
        }
        workboardKeys.forEach((key) => localStorage.removeItem(key));
      }
      return ok(undefined);
    } catch (error) {
      return err(handleStorageError('clear', error, prefix));
    }
  },

  async getKeys(prefix: string): Promise<Result<string[], StorageError>> {
    try {
      if (!isLocalStorageAvailable()) {
        return err({
          type: 'UNSUPPORTED_OPERATION',
          message: 'localStorage not available',
          key: prefix,
        });
      }
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keys.push(key);
        }
      }
      return ok(keys);
    } catch (error) {
      return err(handleStorageError('getKeys', error, prefix));
    }
  },
};

export const isLocalStorageSupported = isLocalStorageAvailable;
