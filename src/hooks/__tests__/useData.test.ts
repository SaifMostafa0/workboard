import { createStorageError } from '@/domain/errors';
import {
  useCreateLabel,
  useCreateSavedView,
  useDeleteEpic,
  useDeleteLabel,
  useDeleteSavedView,
  useLabels,
  useSavedViews,
  useUpdateLabel,
  useUpdateSavedView,
} from '@/hooks/useData';
import type * as StorageModule from '@/infrastructure/storage';
import { FakeStorageAdapter } from '@/test/factories/fakeStorageAdapter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The repositories in `useData` are module-level singletons bound to whichever
// storage adapter the environment reports. Point both adapters at one
// in-memory fake so the hooks read and write deterministic data.
const holder = vi.hoisted(() => ({ adapter: null as unknown }));

vi.mock('@/infrastructure/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof StorageModule>();
  return {
    ...actual,
    get indexedDBAdapter() {
      return holder.adapter;
    },
    get localStorageAdapter() {
      return holder.adapter;
    },
  };
});

vi.mock('@/components/feedback/Toast', () => ({
  useToastHelpers: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

const adapter = new FakeStorageAdapter();
holder.adapter = adapter;

const PROJECT_ID = '123e4567-e89b-42d3-a456-426614174000';
const EPIC_ID = '123e4567-e89b-42d3-a456-426614174030';
const TASK_IN_EPIC = '123e4567-e89b-42d3-a456-426614174040';
const TASK_WITHOUT_EPIC = '123e4567-e89b-42d3-a456-426614174041';

const NOW = '2024-01-01T00:00:00.000Z';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return Wrapper;
}

async function readTask(id: string) {
  const result = await adapter.get<{ id: string; epicId?: string }>(`workboard:tasks:${id}`);
  return result.ok ? result.value : null;
}

describe('useDeleteEpic', () => {
  beforeEach(async () => {
    await adapter.clear();
    await adapter.set(`workboard:epics:${EPIC_ID}`, {
      id: EPIC_ID,
      projectId: PROJECT_ID,
      name: 'Authentication',
      description: '',
      createdAt: NOW,
      updatedAt: NOW,
    });
    await adapter.set(`workboard:tasks:${TASK_IN_EPIC}`, {
      id: TASK_IN_EPIC,
      projectId: PROJECT_ID,
      title: 'Assigned task',
      description: '',
      status: 'todo',
      priority: 'medium',
      tags: [],
      epicId: EPIC_ID,
      createdAt: NOW,
      updatedAt: NOW,
    });
    await adapter.set(`workboard:tasks:${TASK_WITHOUT_EPIC}`, {
      id: TASK_WITHOUT_EPIC,
      projectId: PROJECT_ID,
      title: 'Loose task',
      description: '',
      status: 'todo',
      priority: 'medium',
      tags: [],
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  it('moves the epic to trash and detaches its tasks instead of deleting them', async () => {
    const { result } = renderHook(() => useDeleteEpic(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate(EPIC_ID);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The epic is soft-deleted (trashed), not purged.
    const epic = await adapter.get<{ deletedAt?: string }>(`workboard:epics:${EPIC_ID}`);
    expect(epic.ok && epic.value?.deletedAt).toBeDefined();

    // The assigned task survives and is detached...
    const assigned = await readTask(TASK_IN_EPIC);
    expect(assigned).not.toBeNull();
    expect(assigned?.epicId).toBeUndefined();

    // ...while unrelated tasks are left untouched.
    const loose = await readTask(TASK_WITHOUT_EPIC);
    expect(loose).not.toBeNull();
    expect(loose?.id).toBe(TASK_WITHOUT_EPIC);
  });
});

const LABEL_ID = 'label-1';
const SAVED_VIEW_ID = 'view-1';

function seedLabel() {
  return adapter.set(`workboard:labels:${LABEL_ID}`, {
    id: LABEL_ID,
    name: 'Bug',
    color: '#e11d48',
    createdAt: NOW,
    updatedAt: NOW,
  });
}

function seedSavedView() {
  return adapter.set(`workboard:savedViews:${SAVED_VIEW_ID}`, {
    id: SAVED_VIEW_ID,
    name: 'My work',
    filters: { status: 'todo' },
    createdAt: NOW,
    updatedAt: NOW,
  });
}

describe('label hooks', () => {
  beforeEach(async () => {
    adapter.clearFailMode();
    await adapter.clear();
  });

  it('returns an empty list when no labels exist', async () => {
    const { result } = renderHook(() => useLabels(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('returns stored labels', async () => {
    await seedLabel();
    const { result } = renderHook(() => useLabels(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((label) => label.name)).toEqual(['Bug']);
  });

  it('surfaces list errors', async () => {
    adapter.setFailMode('getAll', createStorageError('PERMISSION_DENIED', 'read failed'));
    const { result } = renderHook(() => useLabels(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('creates a label and persists it', async () => {
    const { result } = renderHook(() => useCreateLabel(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ name: 'Regression', color: '#2563eb' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const id = result.current.data?.id;
    expect(id).toBeDefined();
    expect(await adapter.get(`workboard:labels:${id}`)).toMatchObject({
      ok: true,
      value: { name: 'Regression' },
    });
  });

  it('surfaces create errors', async () => {
    adapter.setFailMode('set', createStorageError('QUOTA_EXCEEDED', 'write failed'));
    const { result } = renderHook(() => useCreateLabel(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ name: 'Regression' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('updates a label and persists the change', async () => {
    await seedLabel();
    const { result } = renderHook(() => useUpdateLabel(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ id: LABEL_ID, update: { name: 'Regression' } });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(await adapter.get(`workboard:labels:${LABEL_ID}`)).toMatchObject({
      ok: true,
      value: { name: 'Regression' },
    });
  });

  it('surfaces update errors', async () => {
    await seedLabel();
    adapter.setFailMode('set', createStorageError('QUOTA_EXCEEDED', 'write failed'));
    const { result } = renderHook(() => useUpdateLabel(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ id: LABEL_ID, update: { name: 'Regression' } });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('deletes a label', async () => {
    await seedLabel();
    const { result } = renderHook(() => useDeleteLabel(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate(LABEL_ID);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(adapter.hasKey(`workboard:labels:${LABEL_ID}`)).toBe(false);
  });

  it('surfaces delete errors', async () => {
    await seedLabel();
    adapter.setFailMode('delete', createStorageError('PERMISSION_DENIED', 'delete failed'));
    const { result } = renderHook(() => useDeleteLabel(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate(LABEL_ID);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('saved view hooks', () => {
  beforeEach(async () => {
    adapter.clearFailMode();
    await adapter.clear();
  });

  it('returns an empty list when no saved views exist', async () => {
    const { result } = renderHook(() => useSavedViews(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('returns stored saved views', async () => {
    await seedSavedView();
    const { result } = renderHook(() => useSavedViews(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((view) => view.name)).toEqual(['My work']);
  });

  it('surfaces list errors', async () => {
    adapter.setFailMode('getAll', createStorageError('PERMISSION_DENIED', 'read failed'));
    const { result } = renderHook(() => useSavedViews(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('creates a saved view and persists it', async () => {
    const { result } = renderHook(() => useCreateSavedView(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ name: 'Blocked work', filters: { blocked: 'true' } });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const id = result.current.data?.id;
    expect(id).toBeDefined();
    expect(await adapter.get(`workboard:savedViews:${id}`)).toMatchObject({
      ok: true,
      value: { name: 'Blocked work' },
    });
  });

  it('surfaces create errors', async () => {
    adapter.setFailMode('set', createStorageError('QUOTA_EXCEEDED', 'write failed'));
    const { result } = renderHook(() => useCreateSavedView(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ name: 'Blocked work', filters: {} });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('updates a saved view and persists the change', async () => {
    await seedSavedView();
    const { result } = renderHook(() => useUpdateSavedView(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ id: SAVED_VIEW_ID, update: { name: 'Blocked work' } });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(await adapter.get(`workboard:savedViews:${SAVED_VIEW_ID}`)).toMatchObject({
      ok: true,
      value: { name: 'Blocked work' },
    });
  });

  it('surfaces update errors', async () => {
    await seedSavedView();
    adapter.setFailMode('set', createStorageError('QUOTA_EXCEEDED', 'write failed'));
    const { result } = renderHook(() => useUpdateSavedView(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ id: SAVED_VIEW_ID, update: { name: 'Blocked work' } });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('deletes a saved view', async () => {
    await seedSavedView();
    const { result } = renderHook(() => useDeleteSavedView(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate(SAVED_VIEW_ID);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(adapter.hasKey(`workboard:savedViews:${SAVED_VIEW_ID}`)).toBe(false);
  });

  it('surfaces delete errors', async () => {
    await seedSavedView();
    adapter.setFailMode('delete', createStorageError('PERMISSION_DENIED', 'delete failed'));
    const { result } = renderHook(() => useDeleteSavedView(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate(SAVED_VIEW_ID);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
