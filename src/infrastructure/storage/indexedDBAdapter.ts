import type { StorageError } from '@/domain/errors';
import type { DBSchema, IDBPDatabase } from 'idb';
import { openDB } from 'idb';
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
      const allRecords = await db.getAll(DATA_STORE);
      const allKeys = await db.getAllKeys(DATA_STORE);

      const results: T[] = [];
      allKeys.forEach((key, index) => {
        if (typeof key === 'string' && key.startsWith(prefix)) {
          results.push(allRecords[index] as T);
        }
      });
      return ok(results);
    } catch (error) {
      return err(handleStorageError('getAll', error, prefix));
    }
  },

  async clear(prefix?: string): Promise<Result<void, StorageError>> {
    try {
      const db = await getDB();
      if (prefix) {
        const allKeys = await db.getAllKeys(DATA_STORE);
        for (const key of allKeys) {
          if (typeof key === 'string' && key.startsWith(prefix)) {
            await db.delete(DATA_STORE, key);
          }
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
      const allKeys = await db.getAllKeys(DATA_STORE);
      const keys = allKeys
        .filter((key): key is string => typeof key === 'string' && key.startsWith(prefix))
        .map((key) => key);
      return ok(keys);
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
