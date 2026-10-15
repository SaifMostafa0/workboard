import { createStorageError, type StorageError } from '@/domain/errors';
import type { DBSchema, IDBPDatabase } from 'idb';
import { openDB } from 'idb';
import { shouldFailWrites } from './failureInjection';
import type { Result, StorageAdapter } from './storageAdapter';
import { err, handleStorageError, ok } from './storageAdapter';

interface WorkboardDBSchema extends DBSchema {
  data: {
    key: string;
    value: unknown;
  };
  meta: {
    key: string;
    value: { version: number; updatedAt: string };
  };
}

const DB_NAME = 'workboard-db';
const DB_VERSION = 1;
const DATA_STORE = 'data';
const META_STORE = 'meta';

/**
 * The keys for a collection are `workboard:<collection>:<id>`, so a key range
 * from the prefix up to the last possible string that still starts with it
 * selects exactly that collection. Using a range (instead of reading every key
 * in the store and filtering in JS) means IndexedDB only deserializes the
 * records we actually asked for — the difference between a bounded and an
 * unbounded read as the store grows.
 */
const prefixRange = (prefix: string): IDBKeyRange => IDBKeyRange.bound(prefix, `${prefix}\uffff`);

let dbPromise: Promise<IDBPDatabase<WorkboardDBSchema>> | null = null;

const getDB = async (): Promise<IDBPDatabase<WorkboardDBSchema>> => {
  if (!dbPromise) {
    dbPromise = openDB<WorkboardDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(DATA_STORE)) {
          db.createObjectStore(DATA_STORE);
        }
        if (!db.objectStoreNames.contains(META_STORE)) {
          db.createObjectStore(META_STORE);
        }
      },
    });
  }
  return dbPromise;
};

export const indexedDBAdapter: StorageAdapter = {
  async get<T>(key: string): Promise<Result<T | null, StorageError>> {
    try {
      const db = await getDB();
      const value = await db.get(DATA_STORE, key);
      return ok((value as T) ?? null);
    } catch (error) {
      return err(handleStorageError('get', error, key));
    }
  },

  async set<T>(key: string, value: T): Promise<Result<void, StorageError>> {
    if (shouldFailWrites()) {
      return err(createStorageError('QUOTA_EXCEEDED', 'Injected storage write failure', { key }));
    }
    try {
      const db = await getDB();
      await db.put(DATA_STORE, value, key);
      await db.put(
        META_STORE,
        { version: DB_VERSION, updatedAt: new Date().toISOString() },
        'meta'
      );
      return ok(undefined);
    } catch (error) {
      return err(handleStorageError('set', error, key));
    }
  },

  async delete(key: string): Promise<Result<void, StorageError>> {
    if (shouldFailWrites()) {
      return err(createStorageError('QUOTA_EXCEEDED', 'Injected storage delete failure', { key }));
    }
    try {
      const db = await getDB();
      await db.delete(DATA_STORE, key);
      return ok(undefined);
    } catch (error) {
      return err(handleStorageError('delete', error, key));
    }
  },

  async getAll<T>(prefix: string): Promise<Result<T[], StorageError>> {
    try {
      const db = await getDB();
      const records = await db.getAll(DATA_STORE, prefixRange(prefix));
      return ok(records as T[]);
    } catch (error) {
      return err(handleStorageError('getAll', error, prefix));
    }
  },

  async clear(prefix?: string): Promise<Result<void, StorageError>> {
    try {
      const db = await getDB();
      if (prefix) {
        const keys = await db.getAllKeys(DATA_STORE, prefixRange(prefix));
        for (const key of keys) {
          await db.delete(DATA_STORE, key);
        }
      } else {
        await db.clear(DATA_STORE);
      }
      return ok(undefined);
    } catch (error) {
      return err(handleStorageError('clear', error, prefix));
    }
  },

  async getKeys(prefix: string): Promise<Result<string[], StorageError>> {
    try {
      const db = await getDB();
      const keys = await db.getAllKeys(DATA_STORE, prefixRange(prefix));
      return ok(keys.filter((key): key is string => typeof key === 'string'));
    } catch (error) {
      return err(handleStorageError('getKeys', error, prefix));
    }
  },
};

export const closeDB = async (): Promise<void> => {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
};

export const deleteDB = async (): Promise<void> => {
  await closeDB();
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
