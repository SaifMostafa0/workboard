export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done'];
export const TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const TASK_PRIORITY_ORDER: Record<TaskPriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
  urgent: 3,
};

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  assignee?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  /** Set when the task is moved to trash; omitted for active tasks. */
  deletedAt?: string;
  /**
   * The id of the parent task when this is a sub-task. Omitted for top-level
   * tasks. Nesting is limited to one level (`MAX_SUBTASK_DEPTH`).
   */
  parentId?: string;
  /**
   * The id of the epic this task belongs to. Omitted for tasks that are not
   * part of any epic. Epics are a separate entity above tasks (see
   * `src/domain/epic.ts`) and live in the same project.
   */
  epicId?: string;
}

export interface TaskInput {
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  assignee?: string;
  tags: string[];
  parentId?: string;
  epicId?: string;
}

export type TaskUpdate = Partial<TaskInput>;

/** Sub-tasks may only be nested one level deep (a sub-task has no children). */
export const MAX_SUBTASK_DEPTH = 1;

export const isSubtask = (task: Pick<Task, 'parentId'>): boolean => Boolean(task.parentId);

export interface SubtaskProgress {
  done: number;
  total: number;
}

/** Counts how many of a parent's direct children are done. */
export const getSubtaskProgress = (children: Array<Pick<Task, 'status'>>): SubtaskProgress => ({
  done: children.filter((child) => child.status === 'done').length,
  total: children.length,
});

export const hasSubtaskProgress = (progress: SubtaskProgress): boolean => progress.total > 0;

export type ParentAssignmentIssue =
  'parent_not_found' | 'parent_is_self' | 'parent_is_subtask' | 'task_has_children';

export const PARENT_ASSIGNMENT_MESSAGES: Record<ParentAssignmentIssue, string> = {
  parent_not_found: 'The parent task could not be found',
  parent_is_self: 'A task cannot be its own parent',
  parent_is_subtask: 'Sub-tasks cannot have their own sub-tasks (maximum depth is one level)',
  task_has_children: 'A task that already has sub-tasks cannot itself become a sub-task',
};

/**
 * Pure hierarchy check for (re)assigning a parent. `parent` is the resolved
 * parent record (or null when missing); `taskHasChildren` is true when the task
 * being re-parented already has children of its own.
 */
export const validateParentAssignment = (params: {
  taskId: string;
  parentId: string;
  parent: Pick<Task, 'id' | 'parentId'> | null;
  taskHasChildren: boolean;
}): ParentAssignmentIssue | null => {
  if (params.parentId === params.taskId) return 'parent_is_self';
  if (!params.parent) return 'parent_not_found';
  if (params.parent.parentId) return 'parent_is_subtask';
  if (params.taskHasChildren) return 'task_has_children';
  return null;
};

export const isValidTaskStatus = (status: string): status is TaskStatus => {
  return TASK_STATUSES.includes(status as TaskStatus);
};

export const isValidTaskPriority = (priority: string): priority is TaskPriority => {
  return TASK_PRIORITIES.includes(priority as TaskPriority);
};

export const DEFAULT_TASK_STATUS: TaskStatus = 'todo';
export const DEFAULT_TASK_PRIORITY: TaskPriority = 'medium';
