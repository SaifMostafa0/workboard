import type { StorageError } from '@/domain/errors';
import { createStorageError } from '@/domain/errors';
import type { Result, StorageAdapter } from '@/infrastructure/storage/storageAdapter';
import { err, ok, parseStorageKey, STORAGE_PREFIX } from '@/infrastructure/storage/storageAdapter';
import type { HttpClient, HttpOutcome } from './http';

/**
 * A `StorageAdapter` whose backing store is a remote HTTP API (WB-201 spike).
 *
 * The existing repositories (`createProjectRepository`, `createTaskRepository`,
 * …) are pure functions of a `StorageAdapter`, so mounting this adapter behind
 * them yields fully contract-compliant repositories over a network **without
 * touching a single repository, hook or component**. That is the core finding
 * of the spike: the real extension seam is `StorageAdapter`, not the repository
 * classes.
 *
 * Every failure is returned as `Result.err`, never thrown, so the app's error
 * model is preserved.
 */

const NETWORK_MESSAGE = 'sync request could not reach the server';

const networkError = (path: string, reason: string): StorageError =>
  createStorageError('CORRUPTED_DATA', `${NETWORK_MESSAGE} (${path}: ${reason})`, {
    key: path,
    cause: new Error(reason),
  });

const serverError = (path: string, status: number): StorageError =>
  createStorageError('CORRUPTED_DATA', `sync server responded ${status} for ${path}`, {
    key: path,
  });

const malformedError = (path: string): StorageError =>
  createStorageError('CORRUPTED_DATA', `sync server returned an unreadable body for ${path}`, {
    key: path,
  });

/** `workboard:projects:` -> `projects`. */
const collectionFromPrefix = (prefix: string): string | null => {
  if (!prefix.startsWith(STORAGE_PREFIX)) return null;
  const rest = prefix.slice(STORAGE_PREFIX.length);
  const colon = rest.indexOf(':');
  const collection = colon === -1 ? rest : rest.slice(0, colon);
  return collection || null;
};

const segment = (value: string): string => encodeURIComponent(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const createRemoteStorageAdapter = (client: HttpClient): StorageAdapter => {
  const send = (request: Parameters<HttpClient['request']>[0]): Promise<HttpOutcome> =>
    client.request(request);

  return {
    async get<T>(key: string): Promise<Result<T | null, StorageError>> {
      const parsed = parseStorageKey(key);
      if (!parsed) return err(malformedError(key));

      const path = `/storage/${segment(parsed.collection)}/${segment(parsed.id)}`;
      const outcome = await send({ method: 'GET', path });

      if (!outcome.ok) return err(networkError(path, outcome.error));
      if (outcome.status === 404) return ok(null);
      if (outcome.status >= 400) return err(serverError(path, outcome.status));
      if (!isRecord(outcome.body) || !('item' in outcome.body)) return err(malformedError(path));

      const item = outcome.body.item;
      return ok((item ?? null) as T | null);
    },

    async set<T>(key: string, value: T): Promise<Result<void, StorageError>> {
      const parsed = parseStorageKey(key);
      if (!parsed) return err(malformedError(key));

      const path = `/storage/${segment(parsed.collection)}/${segment(parsed.id)}`;
      const outcome = await send({ method: 'PUT', path, body: { item: value } });

      if (!outcome.ok) return err(networkError(path, outcome.error));
      if (outcome.status >= 400) return err(serverError(path, outcome.status));
      return ok(undefined);
    },

    async delete(key: string): Promise<Result<void, StorageError>> {
      const parsed = parseStorageKey(key);
      if (!parsed) return err(malformedError(key));

      const path = `/storage/${segment(parsed.collection)}/${segment(parsed.id)}`;
      const outcome = await send({ method: 'DELETE', path });

      if (!outcome.ok) return err(networkError(path, outcome.error));
      // Deleting an already-absent record is a no-op, matching the local adapters.
      if (outcome.status >= 400 && outcome.status !== 404) {
        return err(serverError(path, outcome.status));
      }
      return ok(undefined);
    },

    async getAll<T>(prefix: string): Promise<Result<T[], StorageError>> {
      const collection = collectionFromPrefix(prefix);
      if (!collection) return err(malformedError(prefix));

      const path = `/storage/${segment(collection)}`;
      const outcome = await send({ method: 'GET', path });

      if (!outcome.ok) return err(networkError(path, outcome.error));
      if (outcome.status >= 400) return err(serverError(path, outcome.status));
      if (!isRecord(outcome.body) || !Array.isArray(outcome.body.items)) {
        return err(malformedError(path));
      }

      return ok(outcome.body.items as T[]);
    },

    async getKeys(prefix: string): Promise<Result<string[], StorageError>> {
      const collection = collectionFromPrefix(prefix);
      if (!collection) return err(malformedError(prefix));

      const path = `/storage/${segment(collection)}/keys`;
      const outcome = await send({ method: 'GET', path });

      if (!outcome.ok) return err(networkError(path, outcome.error));
      if (outcome.status >= 400) return err(serverError(path, outcome.status));
      if (!isRecord(outcome.body) || !Array.isArray(outcome.body.keys)) {
        return err(malformedError(path));
      }

      const keys = (outcome.body.keys as unknown[]).filter(
        (key): key is string => typeof key === 'string'
      );
      return ok(keys.filter((key) => key.startsWith(prefix)));
    },

    async clear(prefix?: string): Promise<Result<void, StorageError>> {
      const collection = prefix ? collectionFromPrefix(prefix) : undefined;
      if (prefix && !collection) return err(malformedError(prefix));

      const path = collection ? `/storage/${segment(collection)}` : '/storage';
      const outcome = await send({ method: 'DELETE', path });

      if (!outcome.ok) return err(networkError(path, outcome.error));
      if (outcome.status >= 400) return err(serverError(path, outcome.status));
      return ok(undefined);
    },
  };
};
