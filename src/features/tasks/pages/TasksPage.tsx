import { EmptyState, Loading } from '@/components/feedback';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import type { Task, TaskPriority } from '@/domain/task';
import type { TaskInputValidated, TaskUpdateValidated } from '@/domain/validation';
import { TaskCard } from '@/features/tasks/components/TaskCard';
import { TaskFormDialog, TaskFormDialogWithData } from '@/features/tasks/components/TaskFormDialog';
import {
  useCreateTask,
  useDeleteTask,
  useProjects,
  useSettings,
  useTasks,
  useUpdateTask,
} from '@/hooks/useData';
import { AlertCircle, ChevronDown, ChevronUp, ListTodo, Plus, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import styles from './TasksPage.module.css';

const STATUS_OPTIONS: SelectOption[] = [
  { value: '', label: 'All Statuses' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const PRIORITY_OPTIONS: SelectOption[] = [
  { value: '', label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const SORT_OPTIONS = [
  { value: 'updatedAt', label: 'Recently Updated' },
  { value: 'createdAt', label: 'Created Date' },
  { value: 'dueDate', label: 'Due Date' },
  { value: 'priority', label: 'Priority' },
  { value: 'title', label: 'Title' },
] as const;

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isNewRoute = location.pathname === '/tasks/new';
  const { data: settings } = useSettings();
  const showCompleted = settings?.showCompletedTasks ?? true;

  // Parse URL params
  const search = searchParams.get('q') || '';
  const statusFilter = searchParams.get('status') || '';
  const priorityFilter = searchParams.get('priority') || '';
  const projectFilter = searchParams.get('project') || '';
  const dueFilter = searchParams.get('due') || '';
  const sortBy = searchParams.get('sort') || 'updatedAt';
  const sortOrder = searchParams.get('order') || 'desc';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  // Local state for filters (synced with URL)
  const [localSearch, setLocalSearch] = useState(search);
  const [localStatus, setLocalStatus] = useState(statusFilter);
  const [localPriority, setLocalPriority] = useState(priorityFilter);
  const [localProject, setLocalProject] = useState(projectFilter);
  const [localDue, setLocalDue] = useState(dueFilter);
  const [localSortBy, setLocalSortBy] = useState(sortBy);
  const [localSortOrder, setLocalSortOrder] = useState(sortOrder);
  const [localPage, setLocalPage] = useState(page);
  const [localPageSize, setLocalPageSize] = useState(pageSize);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(localSearch);

  // Fetch data
  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useTasks();
  const { data: projects, error: projectsError } = useProjects();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [dialogOpen, setDialogOpen] = useState(false);
  // The create dialog opens either explicitly or via `?new=1` / the `/tasks/new`
  // route. Deriving it from the URL avoids an effect that mirrors route state
  // into component state (and the cascading render that causes).
  const wantsNewTask = isNewRoute || searchParams.get('new') === '1';
  const showCreateTask = dialogOpen || wantsNewTask;
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const handleEditTask = (data: TaskInputValidated | TaskUpdateValidated) => {
    if (!editingTask) return;
    updateTask.mutate(
      { id: editingTask.id, update: data },
      { onSuccess: () => setEditingTask(null) }
    );
  };

  const clearNewTaskIntent = () => {
    if (isNewRoute) {
      navigate('/tasks', { replace: true });
    } else if (searchParams.get('new') === '1') {
      const params = new URLSearchParams(searchParams);
      params.delete('new');
      setSearchParams(params, { replace: true });
    }
  };

  const closeCreateTask = () => {
    setDialogOpen(false);
    clearNewTaskIntent();
  };

  const handleCreateTask = (data: TaskInputValidated | TaskUpdateValidated) => {
    createTask.mutate(
      {
        projectId: data.projectId ?? '',
        title: data.title ?? '',
        description: data.description ?? '',
        status: data.status ?? 'todo',
        priority: data.priority ?? 'medium',
        dueDate: data.dueDate || undefined,
        assignee: data.assignee || undefined,
        tags: data.tags ?? [],
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          clearNewTaskIntent();
        },
      }
    );
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];

    return tasks.filter((task) => {
      // Respect the "Show completed tasks" preference.
      if (!showCompleted && task.status === 'done') return false;

      // Text search
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDescription = task.description.toLowerCase().includes(query);
        const matchesTags = task.tags.some((tag) => tag.toLowerCase().includes(query));
        if (!matchesTitle && !matchesDescription && !matchesTags) return false;
      }

      // Status filter
      if (localStatus && task.status !== localStatus) return false;

      // Priority filter
      if (localPriority && task.priority !== localPriority) return false;

      // Project filter
      if (localProject && task.projectId !== localProject) return false;

      // Due date filter
      if (localDue) {
        const now = new Date();
        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        if (localDue === 'overdue') {
          if (!dueDate || dueDate >= now || task.status === 'done') return false;
        } else if (localDue === 'today') {
          if (!dueDate || dueDate.toDateString() !== now.toDateString()) return false;
        } else if (localDue === 'upcoming') {
          const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          if (!dueDate || dueDate < now || dueDate > weekLater || task.status === 'done')
            return false;
        } else if (localDue === 'no-date') {
          if (dueDate) return false;
        }
      }

      return true;
    });
  }, [tasks, showCompleted, debouncedSearch, localStatus, localPriority, localProject, localDue]);

  // Sort tasks
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      let aVal: string | number, bVal: string | number;

      switch (localSortBy) {
        case 'dueDate':
          aVal = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          bVal = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          break;
        case 'priority': {
          const priorityOrder: Record<TaskPriority, number> = {
            urgent: 4,
            high: 3,
            medium: 2,
            low: 1,
          };
          aVal = priorityOrder[a.priority] || 0;
          bVal = priorityOrder[b.priority] || 0;
          break;
        }
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case 'createdAt':
        case 'updatedAt':
        default:
          aVal = new Date(a[localSortBy as keyof Task] as string).getTime();
          bVal = new Date(b[localSortBy as keyof Task] as string).getTime();
      }

      if (aVal === Infinity && bVal === Infinity) return 0;
      if (aVal === Infinity) return 1;
      if (bVal === Infinity) return -1;

      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return localSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredTasks, localSortBy, localSortOrder]);

  // Pagination
  const totalItems = sortedTasks.length;
  const totalPages = Math.ceil(totalItems / localPageSize) || 1;
  const currentPage = Math.min(Math.max(localPage, 1), totalPages);
  const paginatedTasks = sortedTasks.slice(
    (currentPage - 1) * localPageSize,
    currentPage * localPageSize
  );

  // Keep the URL in sync with the active filters, sort and pagination so that
  // a task view can be shared, bookmarked and restored after a reload.
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (localStatus) params.set('status', localStatus);
    if (localPriority) params.set('priority', localPriority);
    if (localProject) params.set('project', localProject);
    if (localDue) params.set('due', localDue);
    if (localSortBy !== 'updatedAt') params.set('sort', localSortBy);
    if (localSortOrder !== 'desc') params.set('order', localSortOrder);
    if (currentPage > 1) params.set('page', String(currentPage));
    if (localPageSize !== 20) params.set('pageSize', String(localPageSize));
    setSearchParams(params, { replace: true });
  }, [
    debouncedSearch,
    localStatus,
    localPriority,
    localProject,
    localDue,
    localSortBy,
    localSortOrder,
    currentPage,
    localPageSize,
    setSearchParams,
  ]);

  // Handlers
  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    setDebouncedSearch(value);
    setLocalPage(1);
  };

  const handleFilterChange = (filter: string, value: string) => {
    switch (filter) {
      case 'status':
        setLocalStatus(value);
        break;
      case 'priority':
        setLocalPriority(value);
        break;
      case 'project':
        setLocalProject(value);
        break;
      case 'due':
        setLocalDue(value);
        break;
    }
    setLocalPage(1);
  };

  const handleSortChange = (sort: string) => {
    if (sort === localSortBy) {
      setLocalSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setLocalSortBy(sort);
      setLocalSortOrder('asc');
    }
  };

  const handlePageChange = (newPage: number) => {
    setLocalPage(newPage);
  };

  const handlePageSizeChange = (size: number) => {
    setLocalPageSize(size);
    setLocalPage(1);
  };

  const clearFilters = () => {
    setLocalSearch('');
    setDebouncedSearch('');
    setLocalStatus('');
    setLocalPriority('');
    setLocalProject('');
    setLocalDue('');
    setLocalSortBy('updatedAt');
    setLocalSortOrder('desc');
    setLocalPage(1);
  };

  const hasActiveFilters =
    debouncedSearch || localStatus || localPriority || localProject || localDue;

  if (tasksLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Loading size="lg" label="Loading tasks..." />
      </div>
    );
  }

  if (tasksError || projectsError) {
    return (
      <div className={styles.container}>
        <EmptyState
          icon={<AlertCircle className="w-10 h-10" />}
          title="Failed to load tasks"
          description={
            (tasksError ?? projectsError)?.message ?? 'Something went wrong. Please try again.'
          }
          action={{ label: 'Retry', onClick: () => window.location.reload() }}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Tasks</h1>
          <p className={styles.subtitle}>
            {totalItems} {totalItems === 1 ? 'task' : 'tasks'}
            {hasActiveFilters && ` (filtered from ${tasks?.length || 0})`}
          </p>
        </div>
        <Button variant="primary" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4" aria-hidden="true" />
          New Task
        </Button>
      </header>

      {/* Filter Bar */}
      <section className={styles.filterBar} aria-label="Task filters">
        <form className={styles.searchForm} onSubmit={(e) => e.preventDefault()}>
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} aria-hidden="true" />
            <Input
              type="search"
              placeholder="Search tasks..."
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label="Search tasks by title, description, or tags"
            />
          </div>
        </form>

        <div className={styles.filters}>
          <Select
            value={localProject}
            onChange={(e) => handleFilterChange('project', e.target.value)}
            options={[
              { value: '', label: 'All Projects' },
              ...(projects?.map((p) => ({ value: p.id, label: p.name })) || []),
            ]}
            aria-label="Filter by project"
            className={styles.filterSelect}
          />

          <Select
            value={localStatus}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            options={STATUS_OPTIONS}
            aria-label="Filter by status"
            className={styles.filterSelect}
          />

          <Select
            value={localPriority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
            options={PRIORITY_OPTIONS}
            aria-label="Filter by priority"
            className={styles.filterSelect}
          />

          <Select
            value={localDue}
            onChange={(e) => handleFilterChange('due', e.target.value)}
            options={[
              { value: '', label: 'All Dates' },
              { value: 'overdue', label: 'Overdue' },
              { value: 'today', label: 'Due Today' },
              { value: 'upcoming', label: 'Upcoming (7 days)' },
              { value: 'no-date', label: 'No Due Date' },
            ]}
            aria-label="Filter by due date"
            className={styles.filterSelect}
          />

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4" aria-hidden="true" />
              Clear
            </Button>
          )}
        </div>
      </section>

      {/* Sort & View Controls */}
      <div className={styles.controls}>
        <div className={styles.sortControl}>
          <label htmlFor="sort-by" className={styles.sortLabel}>
            Sort by:
          </label>
          <Select
            id="sort-by"
            value={localSortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            options={SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            className={styles.sortSelect}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocalSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            aria-label={localSortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}
            aria-pressed={localSortOrder === 'desc'}
          >
            {localSortOrder === 'asc' ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>

        <div className={styles.pageSizeControl}>
          <label htmlFor="page-size" className={styles.pageSizeLabel}>
            Per page:
          </label>
          <Select
            id="page-size"
            value={localPageSize.toString()}
            onChange={(e) => handlePageSizeChange(parseInt(e.target.value, 10))}
            options={PAGE_SIZE_OPTIONS.map((s) => ({
              value: s.toString(),
              label: `${s} per page`,
            }))}
            className={styles.pageSizeSelect}
          />
        </div>
      </div>

      {/* Task List */}
      {paginatedTasks.length === 0 ? (
        <EmptyState
          icon={<ListTodo className="w-10 h-10" />}
          title={totalItems === 0 ? 'No tasks yet' : 'No tasks match your filters'}
          description={
            totalItems === 0
              ? 'Create your first task to get started.'
              : 'Try adjusting your search or filter criteria.'
          }
          action={
            totalItems === 0
              ? { label: 'Create Task', onClick: () => setDialogOpen(true) }
              : undefined
          }
          secondaryAction={
            hasActiveFilters ? { label: 'Clear Filters', onClick: clearFilters } : undefined
          }
        />
      ) : (
        <>
          <div className={styles.taskList} role="list">
            {paginatedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusChange={(id, status) => updateTask.mutate({ id, update: { status } })}
                onEdit={(t) => setEditingTask(tasks?.find((x) => x.id === t.id) ?? null)}
                onDelete={(id, title) => {
                  if (window.confirm(`Move "${title}" to Trash?`)) {
                    deleteTask.mutate(id);
                  }
                }}
                variant="list"
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className={styles.pagination} aria-label="Task pagination">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                Previous
              </Button>

              <span className={styles.pageInfo} aria-live="polite">
                Page {currentPage} of {totalPages}
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="Next page"
              >
                Next
              </Button>
            </nav>
          )}
        </>
      )}

      <TaskFormDialog
        open={showCreateTask}
        onClose={closeCreateTask}
        projectId={localProject}
        projects={projects?.map((p) => ({ id: p.id, name: p.name }))}
        isLoading={createTask.isPending}
        onSubmit={handleCreateTask}
      />

      {editingTask && (
        <TaskFormDialogWithData
          open={true}
          onClose={() => setEditingTask(null)}
          projectId={editingTask.projectId}
          initialData={{
            id: editingTask.id,
            title: editingTask.title,
            description: editingTask.description,
            status: editingTask.status,
            priority: editingTask.priority,
            dueDate: editingTask.dueDate,
            assignee: editingTask.assignee,
            tags: editingTask.tags,
          }}
          isLoading={updateTask.isPending}
          onSubmit={handleEditTask}
        />
      )}
    </div>
  );
}
