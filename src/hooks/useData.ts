import { useToastHelpers } from '@/components/feedback/Toast';
import type { Project, ProjectInput, ProjectUpdate, Task, TaskInput, TaskUpdate } from '@/domain';
import {
  createProjectRepository,
  createSettingsRepository,
  createTaskRepository,
} from '@/infrastructure/repositories';
import type { UserSettings } from '@/infrastructure/repositories/settingsRepository';
import { indexedDBAdapter, localStorageAdapter } from '@/infrastructure/storage';
import {
  clearAllData,
  exportAllData,
  importData as importDataFromStorage,
  resetToDemoData,
  validateImportData,
} from '@/infrastructure/storage/migrations';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Storage adapter selection
const getStorageAdapter = () => {
  if (typeof window !== 'undefined' && 'indexedDB' in window) {
    return indexedDBAdapter;
  }
  return localStorageAdapter;
};

// Repository instances (singletons)
let projectRepository: ReturnType<typeof createProjectRepository> | null = null;
let taskRepository: ReturnType<typeof createTaskRepository> | null = null;
let settingsRepository: ReturnType<typeof createSettingsRepository> | null = null;

const getProjectRepository = () => {
  if (!projectRepository) {
    projectRepository = createProjectRepository(getStorageAdapter());
  }
  return projectRepository;
};

const getTaskRepository = () => {
  if (!taskRepository) {
    taskRepository = createTaskRepository(getStorageAdapter());
  }
  return taskRepository;
};

const getSettingsRepository = () => {
  if (!settingsRepository) {
    settingsRepository = createSettingsRepository(getStorageAdapter());
  }
  return settingsRepository;
};

// Query keys
export const queryKeys = {
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  tasks: (filters?: Record<string, unknown>) =>
    filters ? (['tasks', filters] as const) : (['tasks'] as const),
  task: (id: string) => ['tasks', id] as const,
  trash: ['trash'] as const,
  settings: ['settings'] as const,
};

// Project hooks
export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: async () => {
      const repo = getProjectRepository();
      const result = await repo.list();
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: async () => {
      const repo = getProjectRepository();
      const result = await repo.get(id);
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { success, error } = useToastHelpers();

  return useMutation({
    mutationFn: async (input: ProjectInput) => {
      const repo = getProjectRepository();
      const result = await repo.create(input);
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      success('Project created', `"${newProject.name}" has been created.`);
    },
    onError: (err: Error) => {
      error('Failed to create project', err.message);
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { success, error } = useToastHelpers();

  return useMutation({
    mutationFn: async ({ id, update }: { id: string; update: ProjectUpdate }) => {
      const repo = getProjectRepository();
      const result = await repo.update(id, update);
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
    onMutate: async ({ id, update }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects });
      await queryClient.cancelQueries({ queryKey: queryKeys.project(id) });

      const previousProjects = queryClient.getQueryData(queryKeys.projects);
      const previousProject = queryClient.getQueryData(queryKeys.project(id));

      queryClient.setQueryData(queryKeys.projects, (old: Project[] | undefined) =>
        old?.map((p) =>
          p.id === id ? { ...p, ...update, updatedAt: new Date().toISOString() } : p
        )
      );
      queryClient.setQueryData(queryKeys.project(id), (old: Project | undefined) =>
        old ? { ...old, ...update, updatedAt: new Date().toISOString() } : old
      );

      return {
        previousProjects: previousProjects as Project[] | undefined,
        previousProject: previousProject as Project | undefined,
      };
    },
    onError: (
      err: Error,
      _,
      context: { previousProjects?: Project[]; previousProject?: Project } | undefined
    ) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(queryKeys.projects, context.previousProjects);
      }
      if (context?.previousProject) {
        queryClient.setQueryData(
          queryKeys.project(context.previousProject.id),
          context.previousProject
        );
      }
      error('Failed to update project', err.message);
    },
    onSuccess: (updatedProject) => {
      success('Project updated', `"${updatedProject.name}" has been updated.`);
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      queryClient.invalidateQueries({ queryKey: queryKeys.project(id) });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { success, error, info } = useToastHelpers();

  return useMutation({
    mutationFn: async (id: string) => {
      const repo = getProjectRepository();
      const taskRepo = getTaskRepository();

      // Move associated tasks to trash first so the project can be restored as a whole.
      const deleteTasksResult = await taskRepo.deleteByProject(id);
      if (!deleteTasksResult.ok) throw new Error(deleteTasksResult.error.message);

      // Move project to trash
      const result = await repo.delete(id);
      if (!result.ok) throw new Error(result.error.message);

      return { deletedTasks: deleteTasksResult.value };
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.trash });
      queryClient.removeQueries({ queryKey: queryKeys.project(id) });

      const undo = async () => {
        const repo = getProjectRepository();
        const taskRepo = getTaskRepository();
        const restoreResult = await repo.restore(id);
        if (!restoreResult.ok) {
          error('Failed to restore project', restoreResult.error.message);
          return;
        }
        await taskRepo.restoreByProject(id);
        queryClient.invalidateQueries({ queryKey: queryKeys.projects });
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
        queryClient.invalidateQueries({ queryKey: queryKeys.trash });
        success('Project restored', 'The project and its tasks are back.');
      };

      info('Project moved to trash', 'Undo now, or restore it later from Trash.', {
        duration: 8000,
        action: { label: 'Undo', onClick: () => void undo() },
      });
    },
    onError: (err: Error) => {
      error('Failed to delete project', err.message);
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const { success, error, info } = useToastHelpers();

  return useMutation({
    mutationFn: async (id: string) => {
      const repo = getTaskRepository();
      const result = await repo.delete(id);
      if (!result.ok) throw new Error(result.error.message);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.trash });

      const undo = async () => {
        const repo = getTaskRepository();
        const restoreResult = await repo.restore(id);
        if (!restoreResult.ok) {
          error('Failed to restore task', restoreResult.error.message);
          return;
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
        queryClient.invalidateQueries({ queryKey: queryKeys.trash });
        success('Task restored', 'The task is back.');
      };

      info('Task moved to trash', 'Undo now, or restore it later from Trash.', {
        duration: 8000,
        action: { label: 'Undo', onClick: () => void undo() },
      });
    },
    onError: (err: Error) => {
      error('Failed to delete task', err.message);
    },
  });
}

// Trash hooks
export function useTrash() {
  return useQuery({
    queryKey: queryKeys.trash,
    queryFn: async () => {
      const projectResult = await getProjectRepository().listDeleted();
      if (!projectResult.ok) throw new Error(projectResult.error.message);
      const taskResult = await getTaskRepository().listDeleted();
      if (!taskResult.ok) throw new Error(taskResult.error.message);
      return { projects: projectResult.value, tasks: taskResult.value };
    },
  });
}

export function useRestoreProject() {
  const queryClient = useQueryClient();
  const { success, error } = useToastHelpers();

  return useMutation({
    mutationFn: async (id: string) => {
      const projectResult = await getProjectRepository().restore(id);
      if (!projectResult.ok) throw new Error(projectResult.error.message);
      await getTaskRepository().restoreByProject(id);
      return projectResult.value;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.trash });
      success('Project restored', `"${project.name}" and its tasks are back.`);
    },
    onError: (err: Error) => {
      error('Failed to restore project', err.message);
    },
  });
}

export function useRestoreTask() {
  const queryClient = useQueryClient();
  const { success, error } = useToastHelpers();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await getTaskRepository().restore(id);
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.trash });
      success('Task restored', `"${task.title}" is back.`);
    },
    onError: (err: Error) => {
      error('Failed to restore task', err.message);
    },
  });
}

export function usePurgeProject() {
  const queryClient = useQueryClient();
  const { success, error } = useToastHelpers();

  return useMutation({
    mutationFn: async (id: string) => {
      const taskResult = await getTaskRepository().purgeByProject(id);
      if (!taskResult.ok) throw new Error(taskResult.error.message);
      const result = await getProjectRepository().purge(id);
      if (!result.ok) throw new Error(result.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.trash });
      success('Deleted permanently', 'The project and its tasks were removed for good.');
    },
    onError: (err: Error) => {
      error('Failed to delete project permanently', err.message);
    },
  });
}

export function usePurgeTask() {
  const queryClient = useQueryClient();
  const { success, error } = useToastHelpers();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await getTaskRepository().purge(id);
      if (!result.ok) throw new Error(result.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.trash });
      success('Deleted permanently', 'The task was removed for good.');
    },
    onError: (err: Error) => {
      error('Failed to delete task permanently', err.message);
    },
  });
}

export function useEmptyTrash() {
  const queryClient = useQueryClient();
  const { success, error } = useToastHelpers();

  return useMutation({
    mutationFn: async () => {
      const projectRepo = getProjectRepository();
      const taskRepo = getTaskRepository();

      const [projectsResult, tasksResult] = await Promise.all([
        projectRepo.listDeleted(),
        taskRepo.listDeleted(),
      ]);
      if (!projectsResult.ok) throw new Error(projectsResult.error.message);
      if (!tasksResult.ok) throw new Error(tasksResult.error.message);

      for (const project of projectsResult.value) {
        const result = await projectRepo.purge(project.id);
        if (!result.ok) throw new Error(result.error.message);
      }
      for (const task of tasksResult.value) {
        const result = await taskRepo.purge(task.id);
        if (!result.ok) throw new Error(result.error.message);
      }

      return { projects: projectsResult.value.length, tasks: tasksResult.value.length };
    },
    onSuccess: ({ projects, tasks }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.trash });
      success('Trash emptied', `Removed ${projects} projects and ${tasks} tasks permanently.`);
    },
    onError: (err: Error) => {
      error('Failed to empty trash', err.message);
    },
  });
}

// Task hooks
export function useTasks(filters?: { projectId?: string } & Record<string, unknown>) {
  const projectId = typeof filters?.projectId === 'string' ? filters.projectId : undefined;

  return useQuery({
    queryKey: queryKeys.tasks(filters),
    queryFn: async () => {
      const repo = getTaskRepository();
      const result = await repo.list(projectId);
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: queryKeys.task(id),
    queryFn: async () => {
      const repo = getTaskRepository();
      const result = await repo.get(id);
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { success, error } = useToastHelpers();

  return useMutation({
    mutationFn: async (input: TaskInput) => {
      const repo = getTaskRepository();
      const result = await repo.create(input);
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks({}) });
      success('Task created', `"${newTask.title}" has been created.`);
    },
    onError: (err: Error) => {
      error('Failed to create task', err.message);
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const { success, error } = useToastHelpers();

  return useMutation({
    mutationFn: async ({ id, update }: { id: string; update: TaskUpdate }) => {
      const repo = getTaskRepository();
      const result = await repo.update(id, update);
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
    onMutate: async ({ id, update }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks() });
      await queryClient.cancelQueries({ queryKey: queryKeys.task(id) });

      const previousTasks = queryClient.getQueryData(queryKeys.tasks());
      const previousTask = queryClient.getQueryData(queryKeys.task(id));

      const updateTaskData = (task: Task) => {
        const completedAt =
          update.status === 'done' && task.status !== 'done'
            ? new Date().toISOString()
            : task.completedAt;
        return { ...task, ...update, updatedAt: new Date().toISOString(), completedAt };
      };

      queryClient.setQueryData(queryKeys.tasks(), (old: Task[] | undefined) =>
        old?.map((t) => (t.id === id ? updateTaskData(t) : t))
      );
      queryClient.setQueryData(queryKeys.task(id), (old: Task | undefined) =>
        old ? updateTaskData(old) : old
      );

      return {
        previousTasks: previousTasks as Task[] | undefined,
        previousTask: previousTask as Task | undefined,
      };
    },
    onError: (
      err: Error,
      _,
      context: { previousTasks?: Task[]; previousTask?: Task } | undefined
    ) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(queryKeys.tasks(), context.previousTasks);
      }
      if (context?.previousTask) {
        queryClient.setQueryData(queryKeys.task(context.previousTask.id), context.previousTask);
      }
      error('Failed to update task', err.message);
    },
    onSuccess: (updatedTask) => {
      if (updatedTask.status === 'done') {
        success('Task completed', `"${updatedTask.title}" marked as done.`);
      } else {
        success('Task updated', `"${updatedTask.title}" has been updated.`);
      }
    },
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.task(id) });
    },
  });
}

/**
 * Apply the same change (e.g. status or priority) to a batch of tasks at once.
 */
export function useBulkUpdateTasks() {
  const queryClient = useQueryClient();
  const { success, error } = useToastHelpers();

  return useMutation({
    mutationFn: async ({ ids, update }: { ids: string[]; update: TaskUpdate }) => {
      const repo = getTaskRepository();
      const result = await repo.updateMany(ids, update);
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      const count = updated.length;
      success('Tasks updated', `${count} ${count === 1 ? 'task' : 'tasks'} updated.`);
    },
    onError: (err: Error) => {
      error('Failed to update tasks', err.message);
    },
  });
}

/**
 * Move a batch of tasks to trash, with a single Undo action on the toast.
 */
export function useBulkDeleteTasks() {
  const queryClient = useQueryClient();
  const { success, error, info } = useToastHelpers();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const repo = getTaskRepository();
      const result = await repo.deleteMany(ids);
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
    onSuccess: (count, ids) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.trash });

      const undo = async () => {
        const repo = getTaskRepository();
        const restoreResult = await repo.restoreMany(ids);
        if (!restoreResult.ok) {
          error('Failed to restore tasks', restoreResult.error.message);
          return;
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
        queryClient.invalidateQueries({ queryKey: queryKeys.trash });
        success('Tasks restored', `${count} ${count === 1 ? 'task is' : 'tasks are'} back.`);
      };

      info(
        `${count} ${count === 1 ? 'task' : 'tasks'} moved to trash`,
        'Undo now, or restore later from Trash.',
        { duration: 8000, action: { label: 'Undo', onClick: () => void undo() } }
      );
    },
    onError: (err: Error) => {
      error('Failed to delete tasks', err.message);
    },
  });
}

export function useTaskCounts(projectId?: string) {
  return useQuery({
    queryKey: ['taskCounts', projectId],
    queryFn: async () => {
      const repo = getTaskRepository();
      const result = await repo.countByStatus(projectId || '');
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
    enabled: !!projectId,
  });
}

// Settings hooks
export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: async () => {
      const repo = getSettingsRepository();
      const result = await repo.get();
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
  });
}

export function useUpdateSettings(options?: { silent?: boolean }) {
  const queryClient = useQueryClient();
  const { success, error } = useToastHelpers();

  return useMutation({
    mutationFn: async (settings: Partial<UserSettings>) => {
      const repo = getSettingsRepository();
      const result = await repo.update(settings);
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings });
      if (!options?.silent) {
        success('Settings saved', 'Your preferences have been updated.');
      }
    },
    onError: (err: Error) => {
      error('Failed to save settings', err.message);
    },
  });
}

// Export/Import hooks
export function useExportData() {
  const { success, error } = useToastHelpers();

  return useMutation({
    mutationFn: async () => {
      const adapter = getStorageAdapter();
      const result = await exportAllData(adapter);
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    },
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workboard-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      success('Export complete', 'Your data has been downloaded.');
    },
    onError: (err: Error) => {
      error('Export failed', err.message);
    },
  });
}

export function useImportData() {
  const queryClient = useQueryClient();
  const { success, error } = useToastHelpers();

  return useMutation({
    mutationFn: async ({ data, mode }: { data: unknown; mode: 'merge' | 'replace' }) => {
      const adapter = getStorageAdapter();

      const validatedData = validateImportData(data);

      const result = await importDataFromStorage(adapter, validatedData, { mode });
      if (!result.ok)
        throw new Error((result as { ok: boolean; error: { message: string } }).error.message);
      return result.value;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.settings });
      success(
        'Import complete',
        `Added ${result.projectsCreated} projects and ${result.tasksCreated} tasks.`
      );
    },
    onError: (err: Error) => {
      error('Import failed', err.message);
    },
  });
}

export function useClearAllData() {
  const queryClient = useQueryClient();
  const { success, error } = useToastHelpers();

  return useMutation({
    mutationFn: async () => {
      const adapter = getStorageAdapter();
      const result = await clearAllData(adapter);
      if (!result.ok) throw new Error(result.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.settings });
      success('All data deleted', 'Your projects, tasks, and preferences have been deleted.');
    },
    onError: (err: Error) => {
      error('Delete failed', err.message);
    },
  });
}

export function useResetDemoData() {
  const queryClient = useQueryClient();
  const { success, error } = useToastHelpers();

  return useMutation({
    mutationFn: async () => {
      const adapter = getStorageAdapter();
      const result = await resetToDemoData(adapter);
      if (!result.ok) throw new Error(result.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.settings });
      success('Demo data reset', 'Sample projects and tasks have been restored.');
    },
    onError: (err: Error) => {
      error('Reset failed', err.message);
    },
  });
}

// Combined hook for convenience
export function useData() {
  const projects = useProjects();
  const tasks = useTasks();
  const settings = useSettings();

  return {
    projects,
    tasks,
    settings,
    isLoading: projects.isLoading || tasks.isLoading || settings.isLoading,
    error: projects.error || tasks.error || settings.error,
  };
}
