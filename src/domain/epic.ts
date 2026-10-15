import type { Task } from './task';

export interface Epic {
  id: string;
  /** The project this epic belongs to. Epics group tasks within a single project. */
  projectId: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  /** Set when the epic is moved to trash; omitted for active epics. */
  deletedAt?: string;
}

export interface EpicInput {
  projectId: string;
  name: string;
  description: string;
}

export type EpicUpdate = Partial<EpicInput>;

/** Rolled-up completion of an epic across the tasks that reference it. */
export interface EpicProgress {
  done: number;
  total: number;
  /** Fraction complete in the range 0..1; 0 when the epic has no tasks. */
  ratio: number;
}

/**
 * Pure roll-up of an epic's completion from the tasks that reference it.
 * `ratio` is 0 for an epic with no tasks so callers can render an empty bar.
 */
export function computeEpicProgress(
  epicId: string,
  tasks: Array<Pick<Task, 'epicId' | 'status'>>
): EpicProgress {
  const epicTasks = tasks.filter((task) => task.epicId === epicId);
  const done = epicTasks.filter((task) => task.status === 'done').length;
  const total = epicTasks.length;
  return { done, total, ratio: total > 0 ? done / total : 0 };
}
