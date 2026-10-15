import { describe, expect, it } from 'vitest';
import type { Epic, EpicInput } from '../epic';
import { computeEpicProgress } from '../epic';
import type { Task } from '../task';

type EpicTask = Pick<Task, 'epicId' | 'status'>;

const task = (epicId: string | undefined, status: EpicTask['status']): EpicTask => ({
  epicId,
  status,
});

describe('Epic Domain', () => {
  describe('computeEpicProgress', () => {
    it('returns zeroed progress for an epic with no tasks', () => {
      const progress = computeEpicProgress('epic-a', []);

      expect(progress).toEqual({ done: 0, total: 0, ratio: 0 });
    });

    it('rolls up done / total across the tasks that reference the epic', () => {
      const tasks: EpicTask[] = [
        task('epic-a', 'done'),
        task('epic-a', 'todo'),
        task('epic-a', 'in_progress'),
        task('epic-a', 'done'),
      ];

      expect(computeEpicProgress('epic-a', tasks)).toEqual({
        done: 2,
        total: 4,
        ratio: 0.5,
      });
    });

    it('ignores tasks belonging to other epics', () => {
      const tasks: EpicTask[] = [
        task('epic-a', 'done'),
        task('epic-b', 'done'),
        task('epic-b', 'todo'),
      ];

      const progress = computeEpicProgress('epic-a', tasks);
      expect(progress.done).toBe(1);
      expect(progress.total).toBe(1);
      expect(progress.ratio).toBe(1);
    });

    it('ignores tasks with no epic assigned', () => {
      const tasks: EpicTask[] = [task(undefined, 'done'), task(undefined, 'done')];

      const progress = computeEpicProgress('epic-a', tasks);
      expect(progress).toEqual({ done: 0, total: 0, ratio: 0 });
    });

    it('reports full progress when every task is done', () => {
      const tasks: EpicTask[] = [task('epic-a', 'done'), task('epic-a', 'done')];
      expect(computeEpicProgress('epic-a', tasks).ratio).toBe(1);
    });
  });

  describe('Epic type structure', () => {
    it('carries a projectId so epics are project-scoped', () => {
      const epic: Epic = {
        id: '123e4567-e89b-42d3-a456-426614174000',
        projectId: '123e4567-e89b-42d3-a456-426614174001',
        name: 'Auth',
        description: '',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      expect(epic.projectId).toBeDefined();
      expect(epic.name).toBe('Auth');
      expect(epic.deletedAt).toBeUndefined();
    });

    it('EpicInput omits generated fields and timestamps', () => {
      const input: EpicInput = { projectId: 'p', name: 'Auth', description: '' };
      expect((input as unknown as Record<string, unknown>).id).toBeUndefined();
      expect((input as unknown as Record<string, unknown>).createdAt).toBeUndefined();
    });
  });
});
