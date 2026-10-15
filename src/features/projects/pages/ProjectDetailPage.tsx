import { EmptyState, Loading } from '@/components/feedback';
import { Button } from '@/components/ui/Button';
import { collectBlockedTaskIds, toTaskOptions } from '@/domain/dependency';
import type { Epic } from '@/domain/epic';
import { computeEpicProgress } from '@/domain/epic';
import { PROJECT_COLOR_HEX, isValidProjectColor } from '@/domain/project';
import type { Task, TaskPriority, TaskStatus } from '@/domain/task';
import type {
  EpicInputValidated,
  TaskInputValidated,
  TaskUpdateValidated,
} from '@/domain/validation';
import { TaskCard } from '@/features/tasks/components/TaskCard';
import { TaskFormDialog, TaskFormDialogWithData } from '@/features/tasks/components/TaskFormDialog';
import {
  useCreateEpic,
  useCreateTask,
  useDeleteEpic,
  useDeleteTask,
  useEpics,
  useProject,
  useSettings,
  useTasks,
  useUpdateEpic,
  useUpdateTask,
} from '@/hooks/useData';
import { cn } from '@/lib/cn';
import { ArrowLeft, Kanban, List, ListTree, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState, type DragEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { EpicFormDialog } from '../components/EpicFormDialog';
import styles from './ProjectDetailPage.module.css';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>(() => {
    const view = searchParams.get('view');
    return view === 'list' ? 'list' : 'kanban';
  });
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [subtaskParent, setSubtaskParent] = useState<Task | null>(null);
  const [showCreateEpic, setShowCreateEpic] = useState(false);
  const [editingEpic, setEditingEpic] = useState<Epic | null>(null);

  const { data: project, isLoading: projectLoading } = useProject(projectId || '');
  const { data: epics } = useEpics(projectId || '');
  const { data: tasks, isLoading: tasksLoading } = useTasks({ projectId });
  const { data: settings } = useSettings();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createEpic = useCreateEpic();
  const updateEpic = useUpdateEpic();
  const deleteEpic = useDeleteEpic();

  const showCompleted = settings?.showCompletedTasks ?? true;

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

  // Which tasks are currently blocked by an unfinished task, and the lightweight
  // options the blocker picker offers.
  const blockedTaskIds = useMemo(() => collectBlockedTaskIds(tasks ?? []), [tasks]);
  const blockerOptions = useMemo(() => toTaskOptions(tasks ?? []), [tasks]);

  if (projectLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Loading size="lg" label="Loading project..." />
      </div>
    );
  }

  if (!project) {
    return (
      <div className={styles.notFound}>
        <EmptyState
          icon={<Kanban className="w-10 h-10" />}
          title="Project not found"
          description="The project you're looking for doesn't exist."
          action={{ label: 'Back to Projects', onClick: () => window.history.back() }}
        />
      </div>
    );
  }

  // Group tasks by status. Sub-tasks are hidden from the top-level board/list
  // unless the user opts in, and the "show completed" preference still applies.
  const allTasks = tasks ?? [];
  const allTasksByStatus = {
    todo: allTasks.filter((t) => t.status === 'todo'),
    in_progress: allTasks.filter((t) => t.status === 'in_progress'),
    done: allTasks.filter((t) => t.status === 'done'),
  };
  const topLevelTasks = showSubtasks ? allTasks : allTasks.filter((t) => !t.parentId);
  const visibleTasks = showCompleted
    ? topLevelTasks
    : topLevelTasks.filter((t) => t.status !== 'done');
  const tasksByStatus = {
    todo: visibleTasks.filter((t) => t.status === 'todo'),
    in_progress: visibleTasks.filter((t) => t.status === 'in_progress'),
    done: visibleTasks.filter((t) => t.status === 'done'),
  };

  const handleStatusChange = (taskId: string, newStatus: 'todo' | 'in_progress' | 'done') => {
    updateTask.mutate({ id: taskId, update: { status: newStatus } });
  };

  // Dropping a card onto another column changes its status. Dropping it back
  // where it started is a no-op (avoids a pointless write + toast).
  const handleDropTask = (taskId: string, newStatus: TaskStatus) => {
    const task = allTasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    updateTask.mutate({ id: taskId, update: { status: newStatus } });
  };

  const handleDelete = (id: string, title: string) => {
    const childCount = subtaskProgressById.get(id)?.total ?? 0;
    const message =
      childCount > 0
        ? `Move "${title}" and its ${childCount} sub-task${childCount === 1 ? '' : 's'} to Trash?`
        : `Move "${title}" to Trash?`;
    if (window.confirm(message)) {
      deleteTask.mutate(id);
    }
  };

  const handleCreateTask = (data: TaskInputValidated | TaskUpdateValidated) => {
    // TaskInputValidated has optional fields, but createTask expects required fields
    // The form validation ensures required fields are present
    createTask.mutate(
      {
        ...data,
        projectId: projectId!,
        title: data.title ?? '',
        description: data.description ?? '',
        status: data.status ?? 'todo',
        priority: data.priority ?? 'medium',
        tags: data.tags ?? [],
        parentId: subtaskParent?.id ?? data.parentId,
      } as TaskInputValidated,
      {
        onSuccess: () => {
          setShowCreateTask(false);
          setSubtaskParent(null);
        },
      }
    );
  };

  const handleAddSubtask = (task: { id: string }) => {
    setSubtaskParent(tasks?.find((candidate) => candidate.id === task.id) ?? null);
    setShowCreateTask(true);
  };

  const handleEditTask = (data: TaskInputValidated | TaskUpdateValidated, taskId: string) => {
    updateTask.mutate({
      id: taskId,
      update: data,
    });
    setEditingTask(null);
  };

  const handleCreateEpic = (data: EpicInputValidated) => {
    createEpic.mutate(
      { ...data, projectId: projectId! },
      { onSuccess: () => setShowCreateEpic(false) }
    );
  };

  const handleEditEpic = (data: EpicInputValidated) => {
    if (!editingEpic) return;
    updateEpic.mutate(
      { id: editingEpic.id, update: data },
      { onSuccess: () => setEditingEpic(null) }
    );
  };

  const handleDeleteEpic = (epic: Epic) => {
    if (
      window.confirm(
        `Move "${epic.name}" to Trash? Tasks assigned to it will be kept but unassigned.`
      )
    ) {
      deleteEpic.mutate(epic.id);
    }
  };

  const updateViewMode = (mode: 'kanban' | 'list') => {
    setViewMode(mode);
    const params = new URLSearchParams(searchParams);
    params.set('view', mode);
    setSearchParams(params);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <Link to="/projects" className={styles.backLink}>
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back to Projects
        </Link>
        <div className={styles.headerRight}>
          <div className={styles.viewToggle} role="group" aria-label="View mode">
            <Button
              variant={viewMode === 'kanban' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => updateViewMode('kanban')}
              aria-pressed={viewMode === 'kanban'}
            >
              <Kanban className="w-4 h-4" aria-hidden="true" />
              <span className={styles.viewLabel}>Board</span>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => updateViewMode('list')}
              aria-pressed={viewMode === 'list'}
            >
              <List className="w-4 h-4" aria-hidden="true" />
              <span className={styles.viewLabel}>List</span>
            </Button>
          </div>
          <Button
            variant={showSubtasks ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowSubtasks((prev) => !prev)}
            aria-pressed={showSubtasks}
          >
            <ListTree className="w-4 h-4" aria-hidden="true" />
            <span className={styles.viewLabel}>
              {showSubtasks ? 'Hide sub-tasks' : 'Show sub-tasks'}
            </span>
          </Button>
          <Button variant="primary" onClick={() => setShowCreateTask(true)}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            New Task
          </Button>
        </div>
      </header>

      {/* Project Info */}
      <div
        className={styles.projectInfo}
        style={
          {
            '--project-color':
              PROJECT_COLOR_HEX[isValidProjectColor(project.color) ? project.color : 'blue'],
          } as React.CSSProperties
        }
      >
        <div className={styles.projectColorBar} aria-hidden="true" />
        <div className={styles.projectDetails}>
          <h1 className={styles.projectName}>{project.name}</h1>
          {project.description && (
            <p className={styles.projectDescription}>{project.description}</p>
          )}
          <div className={styles.projectMeta}>
            <span className={styles.metaItem}>{allTasks.length} tasks</span>
            <span className={styles.metaItem}>{allTasksByStatus.todo.length} to do</span>
            <span className={styles.metaItem}>
              {allTasksByStatus.in_progress.length} in progress
            </span>
            <span className={styles.metaItem}>{allTasksByStatus.done.length} done</span>
          </div>
        </div>
      </div>

      {/* Epic progress roll-up */}
      <section className={styles.epicsBar} aria-label="Epic progress">
        <div className={styles.epicsHeader}>
          <h2 className={styles.epicsTitle}>Epics</h2>
          <Button variant="outline" size="sm" onClick={() => setShowCreateEpic(true)}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            New Epic
          </Button>
        </div>
        <div className={styles.epicsList}>
          {epics?.map((epic) => {
            const { done, total, ratio } = computeEpicProgress(epic.id, allTasks);
            return (
              <div key={epic.id} className={styles.epicItem}>
                <span className={styles.epicName}>{epic.name}</span>
                <span className={styles.epicProgress}>
                  {done}/{total} ({Math.round(ratio * 100)}%)
                </span>
                <progress
                  value={ratio}
                  max={1}
                  aria-label={`${epic.name}: ${done} of ${total} complete`}
                />
                <div className={styles.epicActions}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingEpic(epic)}
                    aria-label={`Edit ${epic.name}`}
                  >
                    <Pencil className="w-4 h-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteEpic(epic)}
                    aria-label={`Delete ${epic.name}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            );
          })}
          {(!epics || epics.length === 0) && (
            <p className={styles.epicEmpty}>
              No epics yet. Create one to group tasks and track rolled-up progress.
            </p>
          )}
        </div>
      </section>

      {/* Task Board / List */}
      {tasksLoading ? (
        <div className={styles.loadingContainer}>
          <Loading size="lg" label="Loading tasks..." />
        </div>
      ) : viewMode === 'kanban' ? (
        <div className={styles.kanbanBoard} role="list">
          {[
            {
              status: 'todo' as const,
              label: 'To Do',
              count: tasksByStatus.todo.length,
              tasks: tasksByStatus.todo.map((t) => ({ ...t, status: 'todo' as TaskStatus })),
            },
            {
              status: 'in_progress' as const,
              label: 'In Progress',
              count: tasksByStatus.in_progress.length,
              tasks: tasksByStatus.in_progress.map((t) => ({
                ...t,
                status: 'in_progress' as TaskStatus,
              })),
            },
            ...(showCompleted
              ? [
                  {
                    status: 'done' as const,
                    label: 'Done',
                    count: tasksByStatus.done.length,
                    tasks: tasksByStatus.done.map((t) => ({ ...t, status: 'done' as TaskStatus })),
                  },
                ]
              : []),
          ].map((column) => (
            <KanbanColumn
              key={column.status}
              status={column.status}
              label={column.label}
              count={column.count}
              tasks={column.tasks}
              onStatusChange={handleStatusChange}
              onDropTask={handleDropTask}
              onEdit={(t) => setEditingTask(tasks?.find((x) => x.id === t.id) ?? null)}
              onDelete={handleDelete}
              subtaskProgressById={subtaskProgressById}
              blockedTaskIds={blockedTaskIds}
              onAddSubtask={handleAddSubtask}
            />
          ))}
        </div>
      ) : (
        <TaskListView
          tasks={visibleTasks}
          onStatusChange={handleStatusChange}
          onEdit={(t) => setEditingTask(tasks?.find((x) => x.id === t.id) ?? null)}
          onDelete={handleDelete}
          onCreateTask={() => setShowCreateTask(true)}
          subtaskProgressById={subtaskProgressById}
          blockedTaskIds={blockedTaskIds}
          onAddSubtask={handleAddSubtask}
        />
      )}

      {/* Create Task Dialog */}
      <TaskFormDialog
        key={subtaskParent?.id ?? 'new-task'}
        open={showCreateTask}
        onClose={() => {
          setShowCreateTask(false);
          setSubtaskParent(null);
        }}
        projectId={subtaskParent?.projectId ?? projectId!}
        parentId={subtaskParent?.id}
        parentTitle={subtaskParent?.title}
        epics={epics}
        blockerOptions={blockerOptions}
        isLoading={createTask.isPending}
        onSubmit={handleCreateTask}
      />

      {/* Edit Task Dialog */}
      {editingTask && (
        <TaskFormDialogWithData
          open={true}
          onClose={() => setEditingTask(null)}
          projectId={projectId!}
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
            blockedBy: editingTask.blockedBy ?? [],
          }}
          epics={epics}
          blockerOptions={blockerOptions}
          isLoading={updateTask.isPending}
          onSubmit={(data) => handleEditTask(data, editingTask.id)}
        />
      )}

      {/* Create Epic Dialog */}
      <EpicFormDialog
        open={showCreateEpic}
        onClose={() => setShowCreateEpic(false)}
        projectId={projectId!}
        isLoading={createEpic.isPending}
        onSubmit={handleCreateEpic}
      />

      {/* Edit Epic Dialog */}
      {editingEpic && (
        <EpicFormDialog
          open
          onClose={() => setEditingEpic(null)}
          projectId={projectId!}
          initialData={{
            id: editingEpic.id,
            name: editingEpic.name,
            description: editingEpic.description,
          }}
          isLoading={updateEpic.isPending}
          onSubmit={handleEditEpic}
        />
      )}
    </div>
  );
}

interface KanbanColumnProps {
  status: 'todo' | 'in_progress' | 'done';
  label: string;
  count: number;
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: string;
    assignee?: string;
    tags: string[];
    updatedAt: string;
  }>;
  onStatusChange: (id: string, status: 'todo' | 'in_progress' | 'done') => void;
  onDropTask: (taskId: string, status: TaskStatus) => void;
  onEdit: (task: { id: string }) => void;
  onDelete: (id: string, title: string) => void;
  subtaskProgressById: Map<string, { done: number; total: number }>;
  blockedTaskIds: Set<string>;
  onAddSubtask: (task: { id: string }) => void;
}

function KanbanColumn({
  status,
  label,
  count,
  tasks,
  onStatusChange,
  onDropTask,
  onEdit,
  onDelete,
  subtaskProgressById,
  blockedTaskIds,
  onAddSubtask,
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const statusColors: Record<'todo' | 'in_progress' | 'done', { bg: string; fg: string }> = {
    todo: { bg: 'var(--color-primary)', fg: 'var(--color-text-inverse)' },
    in_progress: { bg: 'var(--color-warning)', fg: '#111827' },
    done: { bg: 'var(--color-success)', fg: '#111827' },
  };

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    // Preventing the default is what allows a drop to fire here.
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    // Ignore bubbling from descendants so the highlight doesn't flicker.
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setIsDragOver(false);
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const taskId = event.dataTransfer.getData('text/plain');
    if (taskId) onDropTask(taskId, status);
  };

  return (
    <section
      className={cn(styles.column, isDragOver && styles.columnDragOver)}
      aria-labelledby={`column-${status}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <header className={styles.columnHeader}>
        <h2 id={`column-${status}`} className={styles.columnTitle}>
          <span className={styles.columnLabel}>{label}</span>
          <span
            className={styles.columnCount}
            style={{ backgroundColor: statusColors[status].bg, color: statusColors[status].fg }}
          >
            {count}
          </span>
        </h2>
      </header>
      <div className={styles.columnContent} role="list" aria-label={`${label} tasks`}>
        {tasks.length === 0 ? (
          <div className={styles.emptyColumn}>
            <p>No tasks</p>
            <span>Nothing here yet</span>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={onStatusChange}
              onEdit={onEdit}
              onDelete={onDelete}
              draggable
              isDragging={draggingId === task.id}
              onDragStart={(event) => {
                event.dataTransfer.setData('text/plain', task.id);
                event.dataTransfer.effectAllowed = 'move';
                setDraggingId(task.id);
              }}
              onDragEnd={() => setDraggingId(null)}
              subtaskProgress={subtaskProgressById.get(task.id)}
              blocked={blockedTaskIds.has(task.id)}
              onAddSubtask={onAddSubtask}
            />
          ))
        )}
      </div>
    </section>
  );
}

interface TaskListViewProps {
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: string;
    assignee?: string;
    tags: string[];
    updatedAt: string;
  }>;
  onStatusChange: (id: string, status: 'todo' | 'in_progress' | 'done') => void;
  onEdit: (task: { id: string }) => void;
  onDelete: (id: string, title: string) => void;
  onCreateTask: () => void;
  subtaskProgressById: Map<string, { done: number; total: number }>;
  blockedTaskIds: Set<string>;
  onAddSubtask: (task: { id: string }) => void;
}

function TaskListView({
  tasks,
  onStatusChange,
  onEdit,
  onDelete,
  onCreateTask,
  subtaskProgressById,
  blockedTaskIds,
  onAddSubtask,
}: TaskListViewProps) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={<List className="w-10 h-10" />}
        title="No tasks in this project"
        description="Create your first task to get started."
        action={{ label: 'Create Task', onClick: onCreateTask }}
      />
    );
  }

  return (
    <div className={styles.listView} role="list">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onStatusChange={onStatusChange}
          onEdit={onEdit}
          onDelete={onDelete}
          variant="list"
          subtaskProgress={subtaskProgressById.get(task.id)}
          blocked={blockedTaskIds.has(task.id)}
          onAddSubtask={onAddSubtask}
        />
      ))}
    </div>
  );
}
