import { STORAGE_PREFIX, createStorageKey } from '@/infrastructure/storage/storageAdapter';
import { beforeEach, describe, expect, it } from 'vitest';
import { createRemoteStorageAdapter } from '../remoteStorageAdapter';
import { createInMemoryApiServer, type InMemoryApiServer } from '../testing/inMemoryApiServer';

const KEY = createStorageKey('projects', 'p1');

describe('createRemoteStorageAdapter', () => {
  let server: InMemoryApiServer;
  let adapter: ReturnType<typeof createRemoteStorageAdapter>;

  beforeEach(() => {
    server = createInMemoryApiServer();
    adapter = createRemoteStorageAdapter(server.client);
  });

  it('round-trips a value through set/get', async () => {
    const value = { id: 'p1', name: 'Remote' };
    expect((await adapter.set(KEY, value)).ok).toBe(true);

    const result = await adapter.get<typeof value>(KEY);
    expect(result).toEqual({ ok: true, value });
  });

  it('returns ok(null) for a key the server does not know', async () => {
    const result = await adapter.get(createStorageKey('projects', 'missing'));
    expect(result).toEqual({ ok: true, value: null });
  });

  it('deletes idempotently', async () => {
    await adapter.set(KEY, { id: 'p1' });
    expect((await adapter.delete(KEY)).ok).toBe(true);
    expect((await adapter.delete(KEY)).ok).toBe(true);
    expect(await adapter.get(KEY)).toEqual({ ok: true, value: null });
  });

  it('gets only the records for one collection', async () => {
    await adapter.set(createStorageKey('projects', 'p1'), { id: 'p1' });
    await adapter.set(createStorageKey('tasks', 't1'), { id: 't1' });

    const projects = await adapter.getAll<{ id: string }>(`${STORAGE_PREFIX}projects:`);
    expect(projects.ok && projects.value.map((item) => item.id)).toEqual(['p1']);
  });

  it('lists full keys for a collection', async () => {
    await adapter.set(KEY, { id: 'p1' });
    const keys = await adapter.getKeys(`${STORAGE_PREFIX}projects:`);
    expect(keys.ok && keys.value).toEqual([KEY]);
  });

  it('clears a single collection, leaving others intact', async () => {
    await adapter.set(KEY, { id: 'p1' });
    await adapter.set(createStorageKey('tasks', 't1'), { id: 't1' });

    await adapter.clear(`${STORAGE_PREFIX}projects:`);
    expect(await adapter.getAll(`${STORAGE_PREFIX}projects:`)).toEqual({ ok: true, value: [] });
    const tasks = await adapter.getAll(`${STORAGE_PREFIX}tasks:`);
    expect(tasks.ok && tasks.value).toHaveLength(1);
  });

  it('maps a transport failure to Result.err without throwing', async () => {
    server.setOffline(true);

    const result = await adapter.get(KEY);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/could not reach the server/);
  });

  it('maps a 5xx response to Result.err', async () => {
    server.failNext(503);

    const result = await adapter.set(KEY, { id: 'p1' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/503/);
  });

  it('maps an unreadable body to Result.err', async () => {
    const unreadable = {
      request: async () => ({ ok: true as const, status: 200, body: 'not json' }),
    };
    const strictAdapter = createRemoteStorageAdapter(unreadable);

    const result = await strictAdapter.getAll(`${STORAGE_PREFIX}projects:`);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toMatch(/unreadable body/);
  });

  it('rejects keys that are outside the workboard namespace', async () => {
    const result = await adapter.set('some-other-app:key', { id: 'x' });
    expect(result.ok).toBe(false);
  });
});
