import type { Task, TaskUpdate } from '@/domain/task';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApiTaskRepository } from '../apiRepositories';
import { createInMemoryApiServer, type InMemoryApiServer } from '../testing/inMemoryApiServer';

/**
 * Proves the app's optimistic-update pattern keeps working when the repository
 * is network-backed (WB-201 spike).
 *
 * This harness mirrors `useUpdateTask` in `src/hooks/useData.ts` exactly:
 * `onMutate` writes to the cache, `onError` rolls back, `onSettled` refetches.
 * The only difference is that the repository is `createApiTaskRepository`.
 */

const TASK_ID = '11111111-1111-4111-8111-111111111111';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: TASK_ID,
  projectId: '22222222-2222-4222-8222-222222222222',
  title: 'Original',
  description: '',
  status: 'todo',
  priority: 'medium',
  tags: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

interface UseResult {
  data: Task | undefined;
  isPending: boolean;
}

const useOptimisticTask = (
  repository: ReturnType<typeof createApiTaskRepository>,
  taskId: string
): {
  query: UseResult;
  mutation: ReturnType<typeof useMutation<Task, Error, TaskUpdate, { previous?: Task }>>;
} => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const result = await repository.get(taskId);
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
  });

  const mutation = useMutation<Task, Error, TaskUpdate, { previous?: Task }>({
    mutationFn: async (update) => {
      const result = await repository.update(taskId, update);
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
    onMutate: async (update) => {
      await queryClient.cancelQueries({ queryKey: ['task', taskId] });
      const previous = queryClient.getQueryData<Task>(['task', taskId]);
      queryClient.setQueryData<Task>(['task', taskId], (old) =>
        old ? { ...old, ...update, updatedAt: new Date().toISOString() } : old
      );
      return { previous };
    },
    onError: (_error, _update, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['task', taskId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  return { query, mutation };
};

describe('optimistic updates against the API repository', () => {
  let server: InMemoryApiServer;
  let queryClient: QueryClient;
  let repository: ReturnType<typeof createApiTaskRepository>;
  let wrapper: ({ children }: { children: ReactNode }) => ReactNode;

  beforeEach(() => {
    server = createInMemoryApiServer();
    repository = createApiTaskRepository(server.client);
    server.seed('tasks', TASK_ID, makeTask());

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    wrapper = Wrapper;
  });

  const renderOptimistic = () =>
    renderHook(() => useOptimisticTask(repository, TASK_ID), { wrapper });

  it('shows the change immediately and reconciles with the server', async () => {
    const { result } = renderOptimistic();

    await waitFor(() => expect(result.current.query.data?.title).toBe('Original'));

    result.current.mutation.mutate({ title: 'Renamed' });

    // The cache reflects the edit before the network confirms it.
    await waitFor(() => expect(result.current.query.data?.title).toBe('Renamed'));
    await waitFor(() => expect(result.current.mutation.isSuccess).toBe(true));

    expect(server.get('tasks', TASK_ID)).toMatchObject({ title: 'Renamed' });
  });

  it('rolls back to the previous value when the server fails', async () => {
    const { result } = renderOptimistic();
    await waitFor(() => expect(result.current.query.data?.title).toBe('Original'));

    // Fail the next write, after a short delay so the optimistic window is observable.
    server.setLatency(20);
    server.failNext(500);

    const promise = result.current.mutation.mutateAsync({ title: 'Renamed' });
    await expect(promise).rejects.toThrow(/500/);

    await waitFor(() => expect(result.current.query.data?.title).toBe('Original'));
    expect(server.get('tasks', TASK_ID)).toMatchObject({ title: 'Original' });
  });

  it('does not hit the network when the input is rejected client-side', async () => {
    const { result } = renderOptimistic();
    await waitFor(() => expect(result.current.query.data?.title).toBe('Original'));

    const writesBefore = server.requests.filter((request) => request.method === 'PUT').length;
    const promise = result.current.mutation.mutateAsync({ title: '' });
    await expect(promise).rejects.toThrow();

    expect(result.current.query.data?.title).toBe('Original');
    const writesAfter = server.requests.filter((request) => request.method === 'PUT').length;
    expect(writesAfter).toBe(writesBefore);
  });
});
