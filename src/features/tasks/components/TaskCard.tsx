import { Button } from '@/components/ui/Button';
import type { TaskPriority, TaskStatus } from '@/domain/task';
import { cn } from '@/lib/cn';
import { formatRelativeTime, isDueToday, isOverdue } from '@/lib/date';
import {
  Calendar,
  CheckCircle,
  ChevronRight,
  Edit,
  ListTree,
  Tag,
  Trash2,
  User,
} from 'lucide-react';
import type { DragEvent } from 'react';
import { Link } from 'react-router-dom';
import styles from './TaskCard.module.css';

interface TaskCardProps {
  task: {
    id: string;
    projectId?: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: string;
    assignee?: string;
    tags: string[];
    updatedAt: string;
    parentId?: string;
  };
  onStatusChange: (id: string, status: TaskStatus) => void;
  onEdit: (task: { id: string }) => void;
  onDelete: (id: string, title: string) => void;
  variant?: 'kanban' | 'list';
  /** When true, renders a selection checkbox for bulk actions. */
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  /** When true, the card can be dragged (kanban board). */
  draggable?: boolean;
  onDragStart?: (event: DragEvent<HTMLElement>) => void;
  onDragEnd?: (event: DragEvent<HTMLElement>) => void;
  isDragging?: boolean;
  /** Done/total of this task's direct sub-tasks, when it has any. */
  subtaskProgress?: { done: number; total: number };
  /** When provided (and the task is top-level), renders an "Add sub-task" action. */
  onAddSubtask?: (task: { id: string }) => void;
}

export function TaskCard({
  task,
  onStatusChange,
  onEdit,
  onDelete,
  variant = 'kanban',
  selectable = false,
  selected = false,
  onSelect,
  draggable = false,
  onDragStart,
  onDragEnd,
  isDragging = false,
  subtaskProgress,
  onAddSubtask,
}: TaskCardProps) {
  const overdue = task.dueDate && isOverdue(task.dueDate) && task.status !== 'done';
  const dueToday = task.dueDate && isDueToday(task.dueDate) && task.status !== 'done';
  const hasSubtasks = Boolean(subtaskProgress && subtaskProgress.total > 0);

  const statusLabels: Record<TaskStatus, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    done: 'Done',
  };

  const priorityLabels: Record<TaskPriority, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
  };

  return (
    <article
      className={cn(
        styles.card,
        styles[variant],
        styles[`priority-${task.priority}`],
        selected && styles.selected,
        isDragging && styles.dragging
      )}
      role="listitem"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {/* Priority indicator */}
      <div className={styles.priorityBar} aria-hidden="true" />

      {/* Main content */}
      <div className={styles.content}>
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            {selectable && (
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(e) => onSelect?.(task.id, e.target.checked)}
                  aria-label={`Select ${task.title}`}
                />
              </label>
            )}
            <h3 className={styles.title}>
              {task.projectId ? (
                <Link to={`/projects/${task.projectId}`} className={styles.titleLink}>
                  {task.title}
                </Link>
              ) : (
                <span className={styles.titleLink}>{task.title}</span>
              )}
            </h3>
          </div>
          <div className={styles.actions}>
            {!task.parentId && onAddSubtask && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAddSubtask({ id: task.id })}
                aria-label={`Add sub-task to ${task.title}`}
              >
                <ListTree className="w-4 h-4" aria-hidden="true" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit({ id: task.id })}
              aria-label={`Edit ${task.title}`}
            >
              <Edit className="w-4 h-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(task.id, task.title)}
              aria-label={`Delete ${task.title}`}
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </header>

        {task.description && <p className={styles.description}>{task.description}</p>}

        {/* Metadata */}
        <div className={styles.meta}>
          {/* Status badge */}
          <span className={cn(styles.badge, styles[`status-${task.status}`])}>
            {statusLabels[task.status]}
          </span>

          {/* Priority badge */}
          <span className={cn(styles.badge, styles[`priority-${task.priority}`])}>
            {priorityLabels[task.priority]}
          </span>

          {/* Sub-task badge */}
          {task.parentId && (
            <span className={styles.subtaskBadge}>
              <ListTree className="w-3 h-3" aria-hidden="true" />
              Sub-task
            </span>
          )}

          {/* Sub-task progress */}
          {hasSubtasks && subtaskProgress && (
            <span
              className={styles.subtaskProgress}
              aria-label={`${subtaskProgress.done} of ${subtaskProgress.total} sub-tasks done`}
            >
              <ListTree className="w-3 h-3" aria-hidden="true" />
              {subtaskProgress.done}/{subtaskProgress.total}
            </span>
          )}

          {/* Due date */}
          {task.dueDate && (
            <time
              className={cn(styles.dueDate, overdue && styles.overdue, dueToday && styles.dueToday)}
              dateTime={task.dueDate}
            >
              <Calendar className="w-3 h-3" aria-hidden="true" />
              {overdue ? 'Overdue' : dueToday ? 'Due today' : formatRelativeTime(task.dueDate)}
            </time>
          )}

          {/* Assignee */}
          {task.assignee && (
            <span className={styles.assignee}>
              <User className="w-3 h-3" aria-hidden="true" />
              {task.assignee}
            </span>
          )}

          {/* Tags */}
          {task.tags.length > 0 && (
            <div className={styles.tags}>
              {task.tags.slice(0, 3).map((tag) => (
                <span key={tag} className={styles.tag}>
                  <Tag className="w-3 h-3" aria-hidden="true" />
                  {tag}
                </span>
              ))}
              {task.tags.length > 3 && (
                <span className={styles.tagMore}>+{task.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>

        {/* Updated time */}
        <div className={styles.updated}>Updated {formatRelativeTime(task.updatedAt)}</div>
      </div>

      {/* Kanban-specific: status change buttons */}
      {variant === 'kanban' && task.status !== 'done' && (
        <footer className={styles.kanbanActions}>
          {task.status === 'todo' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(task.id, 'in_progress')}
              className={styles.statusButton}
            >
              Start
              <ChevronRight className="w-3 h-3" aria-hidden="true" />
            </Button>
          )}
          {task.status === 'in_progress' && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => onStatusChange(task.id, 'done')}
              className={styles.statusButton}
            >
              Complete
              <CheckCircle className="w-3 h-3" aria-hidden="true" />
            </Button>
          )}
        </footer>
      )}
    </article>
  );
}
