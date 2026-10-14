import { FakeStorageAdapter } from '@/test/factories/fakeStorageAdapter';
import { describe, expect, it } from 'vitest';
import {
  clearAllData,
  exportAllData,
  getSchemaVersion,
  importData,
  initializeApp,
  resetToDemoData,
  runMigrations,
} from '../migrations';

describe('runMigrations', () => {
  it('records the current schema version on a fresh adapter', async () => {
    const adapter = new FakeStorageAdapter();

    const result = await runMigrations(adapter);

    expect(result.ok).toBe(true);
    const version = await getSchemaVersion(adapter);
    expect(version.ok && version.value).toBe(1);
  });

  it('is idempotent when run more than once', async () => {
    const adapter = new FakeStorageAdapter();

    await runMigrations(adapter);
    await runMigrations(adapter);

    const version = await getSchemaVersion(adapter);
    expect(version.ok && version.value).toBe(1);
  });
});

describe('initializeApp', () => {
  it('seeds demo data on a fresh install', async () => {
    const adapter = new FakeStorageAdapter();

    const result = await initializeApp(adapter);

    expect(result.ok).toBe(true);
    const projects = await adapter.getAll('workboard:projects:');
    const tasks = await adapter.getAll('workboard:tasks:');
    expect(projects.ok && projects.value.length).toBeGreaterThan(0);
    expect(tasks.ok && tasks.value.length).toBeGreaterThan(0);
    expect(adapter.getValue('workboard:meta:seeded')).toBe(true);
  });

  it('never re-seeds once the user has cleared their data', async () => {
    const adapter = new FakeStorageAdapter();
    await initializeApp(adapter);

    await clearAllData(adapter);
    const sizeAfterClear = adapter.getStoreSize();

    await initializeApp(adapter);

    expect(adapter.getStoreSize()).toBe(sizeAfterClear);
  });
});

describe('clearAllData', () => {
  it('removes projects, tasks and settings but keeps schema metadata', async () => {
    const adapter = new FakeStorageAdapter();
    await initializeApp(adapter);

    await clearAllData(adapter);

    const projects = await adapter.getAll('workboard:projects:');
    const tasks = await adapter.getAll('workboard:tasks:');
    const settings = await adapter.getAll('workboard:settings:');
    expect(projects.ok && projects.value).toEqual([]);
    expect(tasks.ok && tasks.value).toEqual([]);
    expect(settings.ok && settings.value).toEqual([]);
    expect(adapter.hasKey('workboard:meta:schema')).toBe(true);
    expect(adapter.hasKey('workboard:meta:seeded')).toBe(true);
  });
});

describe('resetToDemoData', () => {
  it('clears user data and restores the sample set', async () => {
    const adapter = new FakeStorageAdapter();
    await initializeApp(adapter);
    await clearAllData(adapter);

    const result = await resetToDemoData(adapter);

    expect(result.ok).toBe(true);
    const projects = await adapter.getAll('workboard:projects:');
    const tasks = await adapter.getAll('workboard:tasks:');
    expect(projects.ok && projects.value.length).toBeGreaterThan(0);
    expect(tasks.ok && tasks.value.length).toBeGreaterThan(0);
  });
});

describe('exportAllData / importData', () => {
  it('round-trips data and creates nothing new when merging an identical export', async () => {
    const adapter = new FakeStorageAdapter();
    await initializeApp(adapter);

    const exported = await exportAllData(adapter);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    expect(exported.value.projects.length).toBeGreaterThan(0);

    const merged = await importData(adapter, exported.value, { mode: 'merge' });

    expect(merged.ok && merged.value).toEqual({ projectsCreated: 0, tasksCreated: 0 });
  });
});
