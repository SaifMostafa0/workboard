import { EmptyState, Loading } from '@/components/feedback';
import { Button } from '@/components/ui/Button';
import { PROJECT_COLOR_HEX, isValidProjectColor } from '@/domain/project';
import type { Task, TaskPriority, TaskStatus } from '@/domain/task';
import type { TaskInputValidated, TaskUpdateValidated } from '@/domain/validation';
import { TaskCard } from '@/features/tasks/components/TaskCard';
import { TaskFormDialog, TaskFormDialogWithData } from '@/features/tasks/components/TaskFormDialog';
import {
  useCreateTask,
  useDeleteTask,
  useProject,
  useSettings,
  useTasks,
  useUpdateTask,
} from '@/hooks/useData';
import { ArrowLeft, Kanban, List, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
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

  const { data: project, isLoading: projectLoading } = useProject(projectId || '');
  const { data: tasks, isLoading: tasksLoading } = useTasks({ projectId });
  const { data: settings } = useSettings();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const showCompleted = settings?.showCompletedTasks ?? true;

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

  // Group tasks by status for kanban view.
  const allTasks = tasks ?? [];
  const tasksByStatus = {
    todo: allTasks.filter((t) => t.status === 'todo'),
    in_progress: allTasks.filter((t) => t.status === 'in_progress'),
    done: allTasks.filter((t) => t.status === 'done'),
  };
  // Respect the "Show completed tasks" preference in the board and list views.
  const visibleTasks = showCompleted ? allTasks : allTasks.filter((t) => t.status !== 'done');

  const handleStatusChange = (taskId: string, newStatus: 'todo' | 'in_progress' | 'done') => {
    updateTask.mutate({ id: taskId, update: { status: newStatus } });
  };

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Move "${title}" to Trash?`)) {
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
      } as TaskInputValidated,
      {
        onSuccess: () => {
          setShowCreateTask(false);
        },
      }
    );
  };

  const handleEditTask = (data: TaskInputValidated | TaskUpdateValidated, taskId: string) => {
    updateTask.mutate({
      id: taskId,
      update: data,
    });
    setEditingTask(null);
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
            <span className={styles.metaItem}>{tasksByStatus.todo.length} to do</span>
            <span className={styles.metaItem}>{tasksByStatus.in_progress.length} in progress</span>
            <span className={styles.metaItem}>{tasksByStatus.done.length} done</span>
          </div>
        </div>
      </div>

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
              onEdit={(t) => setEditingTask(tasks?.find((x) => x.id === t.id) ?? null)}
              onDelete={handleDelete}
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
        />
      )}

      {/* Create Task Dialog */}
      <TaskFormDialog
        open={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        projectId={projectId!}
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
          }}
          isLoading={updateTask.isPending}
          onSubmit={(data) => handleEditTask(data, editingTask.id)}
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
  onEdit: (task: { id: string }) => void;
  onDelete: (id: string, title: string) => void;
}

function KanbanColumn({
  status,
  label,
  count,
  tasks,
  onStatusChange,
  onEdit,
  onDelete,
}: KanbanColumnProps) {
  const statusColors: Record<'todo' | 'in_progress' | 'done', { bg: string; fg: string }> = {
    todo: { bg: 'var(--color-primary)', fg: 'var(--color-text-inverse)' },
    in_progress: { bg: 'var(--color-warning)', fg: '#111827' },
    done: { bg: 'var(--color-success)', fg: '#111827' },
  };

  return (
    <section className={styles.column} aria-labelledby={`column-${status}`}>
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
}

function TaskListView({
  tasks,
  onStatusChange,
  onEdit,
  onDelete,
  onCreateTask,
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
        />
      ))}
    </div>
  );
}
