import { EmptyState, Loading } from '@/components/feedback';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, type SelectOption } from '@/components/ui/Select';
import { VirtualList } from '@/components/ui/VirtualList';
import type { SavedView } from '@/domain/savedView';
import type { Task, TaskPriority, TaskStatus } from '@/domain/task';
import type { SortOrder, TaskQuery, TaskSortField } from '@/domain/taskQuery';
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
  useEpics,
  useProjects,
  useSavedViews,
  useSettings,
  useTaskSummary,
  useTasksPage,
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

/** Stable identities so the derived values don't change on every render. */
const EMPTY_TAGS: string[] = [];
const EMPTY_TASKS: Task[] = [];
const EMPTY_PROGRESS = new Map<string, { done: number; total: number }>();

/**
 * List rows are windowed at a uniform height (see {@link VirtualList}); this is
 * the per-row box, including the gap between rows.
 */
const TASK_WINDOW_THRESHOLD = 30;
const TASK_ROW_GAP = 8;
const TASK_ROW_HEIGHT = 132;
const TASK_LIST_VIEWPORT_HEIGHT = 640;

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
  const [localEpic, setLocalEpic] = useState(searchParams.get('epic') || '');
  const [localSortBy, setLocalSortBy] = useState(sortBy);
  const [localSortOrder, setLocalSortOrder] = useState(sortOrder);
  const [localPage, setLocalPage] = useState(page);
  const [localPageSize, setLocalPageSize] = useState(pageSize);
  const [activeViewId, setActiveViewId] = useState<string | null>(viewParam);
  // Sub-tasks are hidden from the top-level list unless this is toggled on.
  const [showSubtasks, setShowSubtasks] = useState(false);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(localSearch);

  // The list view asks the repository for a single page; the summary hook
  // provides the whole-collection data the page also needs (tag options,
  // active total, sub-task progress) without loading tasks into the component.
  const taskQuery: TaskQuery = useMemo(
    () => ({
      search: debouncedSearch,
      status: localStatus ? (localStatus as TaskStatus) : '',
      priority: localPriority ? (localPriority as TaskPriority) : '',
      projectId: localProject || undefined,
      epicId: localEpic || undefined,
      tags: localTags,
      due: (localDue || '') as TaskQuery['due'],
      includeSubtasks: showSubtasks,
      includeCompleted: showCompleted,
      sortBy: localSortBy as TaskSortField,
      sortOrder: localSortOrder as SortOrder,
      page: localPage,
      pageSize: localPageSize,
    }),
    [
      debouncedSearch,
      localStatus,
      localPriority,
      localProject,
      localEpic,
      localTags,
      localDue,
      showSubtasks,
      showCompleted,
      localSortBy,
      localSortOrder,
      localPage,
      localPageSize,
    ]
  );

  const { data: taskPage, isLoading: tasksLoading, error: tasksError } = useTasksPage(taskQuery);
  const { data: summary } = useTaskSummary();
  const { data: projects, error: projectsError } = useProjects();
  const { data: views } = useSavedViews();
  const { data: epics } = useEpics(localProject || undefined);
  const activeView = views?.find((view) => view.id === activeViewId) ?? null;
  const availableTags = summary?.tags ?? EMPTY_TAGS;
  const subtaskProgressById = summary?.subtaskProgress ?? EMPTY_PROGRESS;
  const totalActiveTasks = summary?.total ?? 0;
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

  // The repository already filtered, sorted and paged the list, so the
  // component only ever holds the rows it renders.
  const paginatedTasks = taskPage?.items ?? EMPTY_TASKS;
  const totalItems = taskPage?.total ?? 0;
  const totalPages = taskPage?.totalPages ?? 1;
  const currentPage = taskPage?.page ?? 1;

  const handleAddSubtask = (task: { id: string }) => {
    setSubtaskParent(paginatedTasks.find((candidate) => candidate.id === task.id) ?? null);
  };

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

  const selectedIdList = useMemo(() => [...selectedIds], [selectedIds]);

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
    if (localEpic) params.set('epic', localEpic);
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
    localEpic,
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
      case 'epic':
        setLocalEpic(value);
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
    setLocalEpic('');
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
    epic: localEpic,
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
    setLocalEpic(next.epic ?? '');
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
            {hasActiveFilters && ` (filtered from ${totalActiveTasks})`}
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

          <Select
            value={localEpic}
            onChange={(e) => handleFilterChange('epic', e.target.value)}
            options={[
              { value: '', label: 'All Epics' },
              ...(epics?.map((e: { id: string; name: string }) => ({
                value: e.id,
                label: e.name,
              })) || []),
            ]}
            aria-label="Filter by epic"
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
          <VirtualList
            items={paginatedTasks}
            className={
              paginatedTasks.length > TASK_WINDOW_THRESHOLD
                ? styles.taskListWindowed
                : styles.taskList
            }
            itemHeight={TASK_ROW_HEIGHT}
            gap={TASK_ROW_GAP}
            viewportHeight={TASK_LIST_VIEWPORT_HEIGHT}
            threshold={TASK_WINDOW_THRESHOLD}
            getKey={(task) => task.id}
            aria-label="Task list"
            renderItem={(task) => (
              <TaskCard
                task={task}
                onStatusChange={(id, status) => updateTask.mutate({ id, update: { status } })}
                onEdit={(t) => setEditingTask(paginatedTasks.find((x) => x.id === t.id) ?? null)}
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
                dense={paginatedTasks.length > TASK_WINDOW_THRESHOLD}
                selectable={selectionMode}
                selected={selectedIds.has(task.id)}
                onSelect={toggleTaskSelected}
                subtaskProgress={subtaskProgressById.get(task.id)}
                onAddSubtask={handleAddSubtask}
              />
            )}
          />

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
        epics={epics}
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
            epicId: editingTask.epicId,
          }}
          epics={epics}
          isLoading={updateTask.isPending}
          onSubmit={handleEditTask}
        />
      )}
    </div>
  );
}
