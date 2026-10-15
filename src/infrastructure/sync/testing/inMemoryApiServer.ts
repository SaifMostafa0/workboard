import { createStorageKey } from '@/infrastructure/storage/storageAdapter';
import type { HttpClient, HttpOutcome, HttpRequest } from '../http';

/**
 * An in-memory stand-in for the sync server used by the WB-201 prototype tests.
 *
 * It speaks the same tiny REST contract as a real deployment would
 * (`/storage/:collection[/:id|/keys]`), so the tests exercise the *real*
 * `RemoteStorageAdapter` serialisation and status-code handling rather than a
 * mock of the adapter itself. It can also simulate transport failures
 * (`setOffline`) and server-side errors (`failNext`).
 */

export interface InMemoryApiServer {
  client: HttpClient;
  /** Requests seen so far, for asserting what reached the "network". */
  requests: HttpRequest[];
  failNext(status: number, times?: number): void;
  setOffline(offline: boolean): void;
  setLatency(ms: number): void;
  /** Seeds a record without going through the HTTP surface. */
  seed(collection: string, id: string, value: unknown): void;
  get(collection: string, id: string): unknown;
  size(collection: string): number;
  reset(): void;
}

const json = (status: number, body: unknown): HttpOutcome => ({ ok: true, status, body });

/**
 * Values cross the wire as JSON in production, so the fake server clones on the
 * way in and out. That stops tests from passing because two "sides" happen to
 * share the same object reference.
 */
const clone = <T>(value: T): T =>
  value === null || typeof value !== 'object' ? value : structuredClone(value);

export const createInMemoryApiServer = (): InMemoryApiServer => {
  const store = new Map<string, Map<string, unknown>>();
  const requests: HttpRequest[] = [];
  let offline = false;
  let latency = 0;
  let failuresLeft = 0;
  let failureStatus = 500;

  const collectionStore = (collection: string): Map<string, unknown> => {
    let bucket = store.get(collection);
    if (!bucket) {
      bucket = new Map();
      store.set(collection, bucket);
    }
    return bucket;
  };

  const handle = (request: HttpRequest): HttpOutcome => {
    if (offline) return { ok: false, error: 'offline' };
    if (failuresLeft > 0) {
      failuresLeft -= 1;
      return json(failureStatus, { error: 'injected failure' });
    }

    const parts = request.path.split('/').filter(Boolean);
    if (parts[0] !== 'storage') return json(404, { error: 'unknown route' });

    const [, collection, id] = parts;

    if (!collection) {
      if (request.method === 'DELETE') {
        store.clear();
        return json(200, { cleared: true });
      }
      return json(404, { error: 'unknown route' });
    }

    const bucket = collectionStore(collection);

    if (!id) {
      if (request.method === 'GET') {
        return json(200, { items: [...bucket.values()].map(clone) });
      }
      if (request.method === 'DELETE') {
        bucket.clear();
        return json(200, { cleared: true });
      }
      return json(405, { error: 'method not allowed' });
    }

    if (id === 'keys') {
      return json(200, {
        keys: [...bucket.keys()].map((key) => createStorageKey(collection, key)),
      });
    }

    const decodedId = decodeURIComponent(id);

    if (request.method === 'GET') {
      if (!bucket.has(decodedId)) return json(404, { error: 'not found' });
      return json(200, { item: clone(bucket.get(decodedId)) });
    }

    if (request.method === 'PUT') {
      const body = request.body;
      const item =
        typeof body === 'object' && body !== null && 'item' in body
          ? (body as { item: unknown }).item
          : null;
      bucket.set(decodedId, clone(item));
      return json(200, { item });
    }

    if (request.method === 'DELETE') {
      const existed = bucket.delete(decodedId);
      return json(200, { deleted: existed });
    }

    return json(405, { error: 'method not allowed' });
  };

  const client: HttpClient = {
    async request(request: HttpRequest): Promise<HttpOutcome> {
      requests.push(request);
      if (latency > 0) {
        await new Promise((resolve) => setTimeout(resolve, latency));
      }
      return handle(request);
    },
  };

  return {
    client,
    requests,
    failNext(status: number, times = 1) {
      failureStatus = status;
      failuresLeft = times;
    },
    setOffline(value: boolean) {
      offline = value;
    },
    setLatency(ms: number) {
      latency = ms;
    },
    seed(collection: string, id: string, value: unknown) {
      collectionStore(collection).set(id, clone(value));
    },
    get(collection: string, id: string) {
      return clone(collectionStore(collection).get(id));
    },
    size(collection: string) {
      return collectionStore(collection).size;
    },
    reset() {
      store.clear();
      requests.length = 0;
      offline = false;
      latency = 0;
      failuresLeft = 0;
    },
  };
};
