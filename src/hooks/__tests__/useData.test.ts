import { useDeleteEpic } from '@/hooks/useData';
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
