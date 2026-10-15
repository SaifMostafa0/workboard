import type { Task, TaskStatus } from './task';

/**
 * Task dependencies ("blocked by / blocks") as pure functions.
 *
 * A task stores the ids of the tasks that block it (`Task.blockedBy`); whether
 * it is *currently* blocked is derived from those blockers' statuses rather
 * than stored, so it can never drift out of sync with the underlying tasks.
 */

/** The most blockers a single task may reference. */
export const MAX_BLOCKERS = 50;

/**
 * The minimal shape the dependency rules need. `Task` (the full record) and the
 * lightweight picker options both satisfy it, so the pure logic can run without
 * loading whole records.
 */
export interface TaskDependencyNode {
  id: string;
  status: TaskStatus;
  blockedBy?: string[];
  deletedAt?: string;
}

export type TaskDependencyIssue = 'self_dependency' | 'blocker_not_found' | 'cycle';

export const DEPENDENCY_MESSAGES: Record<TaskDependencyIssue, string> = {
  self_dependency: 'A task cannot be blocked by itself',
  blocker_not_found: 'One or more of the selected tasks no longer exist',
  cycle: 'That would create a circular dependency (the tasks would block each other)',
};

/**
 * The lightweight task shape the blocker picker and dependency filter need:
 * enough to list candidates and walk the graph, without loading full records.
 */
export interface TaskOption extends TaskDependencyNode {
  id: string;
  title: string;
  status: TaskStatus;
  blockedBy: string[];
}

/** Projects full task records down to their picker/dependency options. */
export const toTaskOptions = (tasks: readonly Task[]): TaskOption[] =>
  tasks
    .filter((task) => !task.deletedAt)
    .map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      blockedBy: task.blockedBy ?? [],
    }));

/** Index tasks by id for O(1) lookups while deriving/walking the graph. */
export const indexTasksById = <T extends TaskDependencyNode>(
  tasks: readonly T[]
): Map<string, T> => {
  const map = new Map<string, T>();
  for (const task of tasks) map.set(task.id, task);
  return map;
};

/**
 * The resolved, still-active tasks that block `task`. References to tasks that
 * are missing or in the trash are ignored, so a deleted blocker never wedges a
 * task permanently.
 */
export const getBlockingTasks = <T extends TaskDependencyNode>(
  task: Pick<TaskDependencyNode, 'blockedBy'>,
  tasksById: ReadonlyMap<string, T>
): T[] => {
  const blocking: T[] = [];
  for (const id of task.blockedBy ?? []) {
    const blocker = tasksById.get(id);
    if (blocker && !blocker.deletedAt) blocking.push(blocker);
  }
  return blocking;
};

/**
 * A task is blocked when it is not itself done and at least one of the tasks
 * blocking it is still open. Derived, never stored.
 */
export const isTaskBlocked = (
  task: TaskDependencyNode,
  tasksById: ReadonlyMap<string, TaskDependencyNode>
): boolean =>
  task.status !== 'done' && getBlockingTasks(task, tasksById).some((b) => b.status !== 'done');

/** The ids of every blocked task in the set, derived in a single pass. */
export const collectBlockedTaskIds = (tasks: readonly Task[]): Set<string> => {
  const byId = indexTasksById(tasks);
  const blocked = new Set<string>();
  for (const task of tasks) {
    if (task.deletedAt) continue;
    if (isTaskBlocked(task, byId)) blocked.add(task.id);
  }
  return blocked;
};

/**
 * True when making `blockerId` block `taskId` would close a loop — i.e. the
 * prospective blocker is already, directly or transitively, blocked by the
 * task (including the trivial `taskId === blockerId` case).
 *
 * Only the *stored* graph is walked: a cycle must include a path from the new
 * blocker back to the task, and every newly added edge points *out of* the
 * task, so checking each new blocker independently is sufficient.
 */
export const wouldCreateDependencyCycle = (
  taskId: string,
  blockerId: string,
  tasksById: ReadonlyMap<string, TaskDependencyNode>
): boolean => {
  if (taskId === blockerId) return true;
  const seen = new Set<string>();
  const stack = [blockerId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === taskId) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const next of tasksById.get(current)?.blockedBy ?? []) stack.push(next);
  }
  return false;
};

/**
 * Pure check for a task's complete blocker list: returns the first problem
 * found (self-reference, a missing blocker, or a cycle) or `null` when valid.
 */
export const validateTaskBlockers = (params: {
  taskId: string;
  blockedBy: readonly string[];
  tasksById: ReadonlyMap<string, TaskDependencyNode>;
}): TaskDependencyIssue | null => {
  const checked = new Set<string>();
  for (const blockerId of params.blockedBy) {
    if (blockerId === params.taskId) return 'self_dependency';
    if (checked.has(blockerId)) continue; // duplicates are harmless
    checked.add(blockerId);

    const blocker = params.tasksById.get(blockerId);
    if (!blocker || blocker.deletedAt) return 'blocker_not_found';
    if (wouldCreateDependencyCycle(params.taskId, blockerId, params.tasksById)) return 'cycle';
  }
  return null;
};
