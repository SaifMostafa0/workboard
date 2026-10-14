import { EmptyState, Loading } from '@/components/feedback';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import type { SavedView } from '@/domain/savedView';
import type { Task, TaskPriority, TaskStatus } from '@/domain/task';
import type { TaskInputValidated, TaskUpdateValidated } from '@/domain/validation';
import { SavedViewsBar } from '@/features/saved-views/components/SavedViewsBar';
import { TagFilter } from '@/features/tasks/components/TagFilter';
import { TaskCard } from '@/features/tasks/components/TaskCard';
import { TaskFormDialog, TaskFormDialogWithData } from '@/features/tasks/components/TaskFormDialog';
import {
  useBulkDeleteTasks,
  useBulkUpdateTasks,
  useCreateTask,
  useDeleteTask,
  useProjects,
  useSavedViews,
  useSettings,
  useTasks,
  useUpdateTask,
} from '@/hooks/useData';
import {
  hasActiveTaskFilters,
  parseTagsParam,
  viewToTaskFilters,
  type TaskFilterState,
} from '@/lib/savedViewFilters';
import {
  AlertCircle,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  ListTodo,
  ListTree,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
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

const BULK_STATUS_OPTIONS: SelectOption[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

const BULK_PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

/**
 * A tri-state checkbox ("select all"). The indeterminate state can only be set
 * through the DOM, hence the ref + effect.
 */
function SelectAllCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label className={styles.selectAllCheckbox}>
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />
    </label>
  );
}

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
  const viewParam = searchParams.get('view');

  // Local state for filters (synced with URL)
  const [localSearch, setLocalSearch] = useState(search);
  const [localStatus, setLocalStatus] = useState(statusFilter);
  const [localPriority, setLocalPriority] = useState(priorityFilter);
  const [localProject, setLocalProject] = useState(projectFilter);
  const [localDue, setLocalDue] = useState(dueFilter);
  const [localTags, setLocalTags] = useState<string[]>(() =>
    parseTagsParam(searchParams.get('tags'))
  );
  const [localSortBy, setLocalSortBy] = useState(sortBy);
  const [localSortOrder, setLocalSortOrder] = useState(sortOrder);
  const [localPage, setLocalPage] = useState(page);
  const [localPageSize, setLocalPageSize] = useState(pageSize);
  const [activeViewId, setActiveViewId] = useState<string | null>(viewParam);
  // Sub-tasks are hidden from the top-level list unless this is toggled on.
  const [showSubtasks, setShowSubtasks] = useState(false);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(localSearch);

  // Fetch data
  const { data: tasks, isLoading: tasksLoading, error: tasksError } = useTasks();
  const { data: projects, error: projectsError } = useProjects();
  const { data: views } = useSavedViews();
  const activeView = views?.find((view) => view.id === activeViewId) ?? null;
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    for (const task of tasks ?? []) {
      for (const tag of task.tags) tags.add(tag);
    }
    return [...tags].sort((a, b) => a.localeCompare(b));
  }, [tasks]);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const bulkUpdateTasks = useBulkUpdateTasks();
  const bulkDeleteTasks = useBulkDeleteTasks();

  // Bulk selection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [dialogOpen, setDialogOpen] = useState(false);
  // The create dialog opens either explicitly or via `?new=1` / the `/tasks/new`
  // route. Deriving it from the URL avoids an effect that mirrors route state
  // into component state (and the cascading render that causes).
  const wantsNewTask = isNewRoute || searchParams.get('new') === '1';
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  // The task that a new sub-task is being created under, if any.
  const [subtaskParent, setSubtaskParent] = useState<Task | null>(null);
  const showCreateTask = dialogOpen || wantsNewTask || subtaskParent !== null;

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
    setSubtaskParent(null);
    clearNewTaskIntent();
  };

  const handleCreateTask = (data: TaskInputValidated | TaskUpdateValidated) => {
    createTask.mutate(
      {
        // A sub-task always lives in its parent's project.
        projectId: subtaskParent?.projectId ?? data.projectId ?? '',
        title: data.title ?? '',
        description: data.description ?? '',
        status: data.status ?? 'todo',
        priority: data.priority ?? 'medium',
        dueDate: data.dueDate || undefined,
        assignee: data.assignee || undefined,
        tags: data.tags ?? [],
        parentId: subtaskParent?.id ?? data.parentId,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setSubtaskParent(null);
          clearNewTaskIntent();
        },
      }
    );
  };

  const handleAddSubtask = (task: { id: string }) => {
    setSubtaskParent(tasks?.find((candidate) => candidate.id === task.id) ?? null);
  };

  // Done/total of each parent's direct sub-tasks (used for the progress badge).
  const subtaskProgressById = useMemo(() => {
    const map = new Map<string, { done: number; total: number }>();
    for (const task of tasks ?? []) {
      if (!task.parentId) continue;
      const entry = map.get(task.parentId) ?? { done: 0, total: 0 };
      entry.total += 1;
      if (task.status === 'done') entry.done += 1;
      map.set(task.parentId, entry);
    }
    return map;
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (!tasks) return [];

    return tasks.filter((task) => {
      // Sub-tasks are hidden from the top-level list unless toggled on.
      if (!showSubtasks && task.parentId) return false;

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

      // Tag filter — a task matches when it carries any selected tag.
      if (localTags.length > 0 && !task.tags.some((tag) => localTags.includes(tag))) return false;

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
  }, [
    tasks,
    showCompleted,
    showSubtasks,
    debouncedSearch,
    localStatus,
    localPriority,
    localProject,
    localDue,
    localTags,
  ]);

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

  // Selection only counts tasks that still exist, so a task deleted elsewhere
  // (or by a bulk action) silently drops out of the selection.
  const selectedTasks = useMemo(
    () => (tasks ?? []).filter((task) => selectedIds.has(task.id)),
    [tasks, selectedIds]
  );
  const selectedOnPage = paginatedTasks.filter((task) => selectedIds.has(task.id)).length;
  const allOnPageSelected = paginatedTasks.length > 0 && selectedOnPage === paginatedTasks.length;

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => !prev);
    setSelectedIds(new Set());
  };

  const toggleTaskSelected = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = (selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const task of paginatedTasks) {
        if (selected) next.add(task.id);
        else next.delete(task.id);
      }
      return next;
    });
  };

  const selectedIdList = selectedTasks.map((task) => task.id);

  const handleBulkStatus = (status: TaskStatus) => {
    bulkUpdateTasks.mutate(
      { ids: selectedIdList, update: { status } },
      { onSuccess: () => setSelectedIds(new Set()) }
    );
  };

  const handleBulkPriority = (priority: TaskPriority) => {
    bulkUpdateTasks.mutate(
      { ids: selectedIdList, update: { priority } },
      { onSuccess: () => setSelectedIds(new Set()) }
    );
  };

  const handleBulkDelete = () => {
    if (selectedIdList.length === 0) return;
    const count = selectedIdList.length;
    if (window.confirm(`Move ${count} selected ${count === 1 ? 'task' : 'tasks'} to Trash?`)) {
      bulkDeleteTasks.mutate(selectedIdList, {
        onSuccess: () => setSelectedIds(new Set()),
      });
    }
  };

  // Keep the URL in sync with the active filters, sort and pagination so that
  // a task view can be shared, bookmarked and restored after a reload.
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (localStatus) params.set('status', localStatus);
    if (localPriority) params.set('priority', localPriority);
    if (localProject) params.set('project', localProject);
    if (localDue) params.set('due', localDue);
    if (localTags.length > 0) params.set('tags', localTags.join(','));
    if (localSortBy !== 'updatedAt') params.set('sort', localSortBy);
    if (localSortOrder !== 'desc') params.set('order', localSortOrder);
    if (currentPage > 1) params.set('page', String(currentPage));
    if (localPageSize !== 20) params.set('pageSize', String(localPageSize));
    if (activeViewId) params.set('view', activeViewId);
    setSearchParams(params, { replace: true });
  }, [
    debouncedSearch,
    localStatus,
    localPriority,
    localProject,
    localDue,
    localTags,
    localSortBy,
    localSortOrder,
    currentPage,
    localPageSize,
    activeViewId,
    setSearchParams,
  ]);

  // Handlers
  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    setDebouncedSearch(value);
    setLocalPage(1);
    setActiveViewId(null);
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
    setActiveViewId(null);
  };

  const handleTagsChange = (tags: string[]) => {
    setLocalTags(tags);
    setLocalPage(1);
    setActiveViewId(null);
  };

  const handleSortChange = (sort: string) => {
    if (sort === localSortBy) {
      setLocalSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setLocalSortBy(sort);
      setLocalSortOrder('asc');
    }
    setActiveViewId(null);
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
    setLocalTags([]);
    setLocalSortBy('updatedAt');
    setLocalSortOrder('desc');
    setLocalPage(1);
    setActiveViewId(null);
  };

  const currentFilters: TaskFilterState = {
    q: debouncedSearch,
    status: localStatus,
    priority: localPriority,
    project: localProject,
    due: localDue,
    tags: localTags,
    sort: localSortBy,
    order: localSortOrder === 'asc' ? 'asc' : 'desc',
  };

  const handleApplyView = (view: SavedView) => {
    const next = viewToTaskFilters(view.filters);
    setLocalSearch(next.q);
    setDebouncedSearch(next.q);
    setLocalStatus(next.status);
    setLocalPriority(next.priority);
    setLocalProject(next.project);
    setLocalDue(next.due);
    setLocalTags(next.tags);
    setLocalSortBy(next.sort);
    setLocalSortOrder(next.order);
    setLocalPage(1);
    setActiveViewId(view.id);
  };

  const hasActiveFilters = hasActiveTaskFilters(currentFilters);

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
            {activeView && ` · View: ${activeView.name}`}
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

        <div className={styles.tagFilterRow}>
          <TagFilter tags={availableTags} selected={localTags} onChange={handleTagsChange} />
        </div>
      </section>

      {/* Saved views */}
      <section className={styles.savedViewsBar} aria-label="Saved views">
        <SavedViewsBar
          views={views ?? []}
          activeViewId={activeViewId}
          currentFilters={currentFilters}
          onApply={handleApplyView}
          onSaved={(view) => setActiveViewId(view.id)}
          onClear={clearFilters}
        />
        <Button variant="ghost" size="sm" onClick={() => navigate('/saved-views')}>
          Manage views
        </Button>
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

        <div className={styles.controlsRight}>
          <Button
            variant={showSubtasks ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setShowSubtasks((prev) => !prev)}
            aria-pressed={showSubtasks}
          >
            <ListTree className="w-4 h-4" aria-hidden="true" />
            {showSubtasks ? 'Hide sub-tasks' : 'Show sub-tasks'}
          </Button>

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

          <Button
            variant={selectionMode ? 'secondary' : 'ghost'}
            size="sm"
            onClick={toggleSelectionMode}
            aria-pressed={selectionMode}
          >
            <CheckSquare className="w-4 h-4" aria-hidden="true" />
            {selectionMode ? 'Cancel' : 'Select'}
          </Button>
        </div>
      </div>

      {/* Bulk actions */}
      {selectionMode && (
        <section className={styles.bulkBar} aria-label="Bulk actions">
          <div className={styles.bulkInfo}>
            <SelectAllCheckbox
              checked={allOnPageSelected}
              indeterminate={selectedOnPage > 0 && !allOnPageSelected}
              onChange={toggleSelectAllOnPage}
              label="Select all tasks on this page"
            />
            <span className={styles.bulkCount} aria-live="polite">
              {selectedIdList.length} selected
            </span>
          </div>

          <div className={styles.bulkActions}>
            <Select
              value=""
              onChange={(e) => e.target.value && handleBulkStatus(e.target.value as TaskStatus)}
              options={BULK_STATUS_OPTIONS}
              placeholder="Set status…"
              aria-label="Set status for selected tasks"
              disabled={selectedIdList.length === 0}
              className={styles.bulkSelect}
            />
            <Select
              value=""
              onChange={(e) => e.target.value && handleBulkPriority(e.target.value as TaskPriority)}
              options={BULK_PRIORITY_OPTIONS}
              placeholder="Set priority…"
              aria-label="Set priority for selected tasks"
              disabled={selectedIdList.length === 0}
              className={styles.bulkSelect}
            />
            <Button
              variant="danger"
              size="sm"
              onClick={handleBulkDelete}
              disabled={selectedIdList.length === 0}
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              disabled={selectedIdList.length === 0}
            >
              Clear
            </Button>
          </div>
        </section>
      )}

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
                  const childCount = subtaskProgressById.get(id)?.total ?? 0;
                  const message =
                    childCount > 0
                      ? `Move "${title}" and its ${childCount} sub-task${childCount === 1 ? '' : 's'} to Trash?`
                      : `Move "${title}" to Trash?`;
                  if (window.confirm(message)) {
                    deleteTask.mutate(id);
                  }
                }}
                variant="list"
                selectable={selectionMode}
                selected={selectedIds.has(task.id)}
                onSelect={toggleTaskSelected}
                subtaskProgress={subtaskProgressById.get(task.id)}
                onAddSubtask={handleAddSubtask}
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
        key={subtaskParent?.id ?? 'new-task'}
        open={showCreateTask}
        onClose={closeCreateTask}
        projectId={subtaskParent?.projectId ?? localProject}
        projects={projects?.map((p) => ({ id: p.id, name: p.name }))}
        parentId={subtaskParent?.id}
        parentTitle={subtaskParent?.title}
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
