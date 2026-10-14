import { validateImportData } from '@/domain/validation';
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
  it('removes projects, tasks, labels, saved views and settings but keeps schema metadata', async () => {
    const adapter = new FakeStorageAdapter();
    await initializeApp(adapter);
    await adapter.set('workboard:labels:123e4567-e89b-12d3-a456-426614174030', {
      id: '123e4567-e89b-12d3-a456-426614174030',
      name: 'Bug',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    await adapter.set('workboard:savedViews:123e4567-e89b-12d3-a456-426614174031', {
      id: '123e4567-e89b-12d3-a456-426614174031',
      name: 'Todo work',
      filters: {},
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });

    await clearAllData(adapter);

    const projects = await adapter.getAll('workboard:projects:');
    const tasks = await adapter.getAll('workboard:tasks:');
    const labels = await adapter.getAll('workboard:labels:');
    const savedViews = await adapter.getAll('workboard:savedViews:');
    const settings = await adapter.getAll('workboard:settings:');
    expect(projects.ok && projects.value).toEqual([]);
    expect(tasks.ok && tasks.value).toEqual([]);
    expect(labels.ok && labels.value).toEqual([]);
    expect(savedViews.ok && savedViews.value).toEqual([]);
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

    expect(merged.ok && merged.value).toEqual({
      projectsCreated: 0,
      tasksCreated: 0,
      labelsCreated: 0,
      savedViewsCreated: 0,
    });
  });

  it('round-trips labels and saved views', async () => {
    const source = new FakeStorageAdapter();
    const label = {
      id: '123e4567-e89b-12d3-a456-426614174040',
      name: 'Bug',
      color: '#e11d48',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    const savedView = {
      id: '123e4567-e89b-12d3-a456-426614174041',
      name: 'Todo work',
      filters: { status: 'todo', tags: ['bug'] },
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
    await source.set(`workboard:labels:${label.id}`, label);
    await source.set(`workboard:savedViews:${savedView.id}`, savedView);

    const exported = await exportAllData(source);
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;
    expect(exported.value.labels).toHaveLength(1);
    expect(exported.value.savedViews).toHaveLength(1);

    const target = new FakeStorageAdapter();
    const imported = await importData(target, exported.value, { mode: 'replace' });

    expect(imported.ok).toBe(true);
    expect(imported.ok && imported.value.labelsCreated).toBe(1);
    expect(imported.ok && imported.value.savedViewsCreated).toBe(1);

    const labels = await target.getAll('workboard:labels:');
    const savedViews = await target.getAll('workboard:savedViews:');
    expect(labels.ok && labels.value).toHaveLength(1);
    expect(savedViews.ok && savedViews.value).toHaveLength(1);
  });

  it('imports a legacy payload that predates labels and saved views', async () => {
    const adapter = new FakeStorageAdapter();
    const legacy = validateImportData({
      version: 1,
      projects: [
        {
          id: '123e4567-e89b-12d3-a456-426614174050',
          name: 'Legacy project',
          description: '',
          color: 'blue',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      tasks: [],
    });

    const imported = await importData(adapter, legacy, { mode: 'replace' });

    expect(imported.ok && imported.value).toEqual({
      projectsCreated: 1,
      tasksCreated: 0,
      labelsCreated: 0,
      savedViewsCreated: 0,
    });
  });

  it('replace mode removes existing labels and saved views before importing', async () => {
    const adapter = new FakeStorageAdapter();
    await adapter.set('workboard:labels:123e4567-e89b-12d3-a456-426614174060', {
      id: '123e4567-e89b-12d3-a456-426614174060',
      name: 'Stale label',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });

    const imported = await importData(
      adapter,
      validateImportData({ version: 1, projects: [], tasks: [], labels: [], savedViews: [] }),
      { mode: 'replace' }
    );

    expect(imported.ok).toBe(true);
    expect(adapter.hasKey('workboard:labels:123e4567-e89b-12d3-a456-426614174060')).toBe(false);
  });

  it('rejects imports whose tasks reference missing projects', async () => {
    const adapter = new FakeStorageAdapter();
    const data = validateImportData({
      version: 1,
      projects: [],
      tasks: [
        {
          id: '123e4567-e89b-12d3-a456-426614174070',
          projectId: '123e4567-e89b-12d3-a456-426614174071',
          title: 'Orphan',
          description: '',
          status: 'todo',
          priority: 'medium',
          tags: [],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
    });

    const imported = await importData(adapter, data, { mode: 'replace' });

    expect(imported.ok).toBe(false);
    if (!imported.ok) expect(imported.error.type).toBe('VALIDATION_ERROR');
  });
});
