import type { ProjectInput } from '@/domain/project';
import type { TaskInput } from '@/domain/task';
import type { IProjectRepository, ITaskRepository } from '@/infrastructure/repositories';
import { beforeEach, describe, expect, it } from 'vitest';

/**
 * A repository-contract suite run against **both** the local and the API-backed
 * implementations (WB-201 spike). If the same assertions pass for both, the
 * `IProjectRepository` / `ITaskRepository` interfaces are genuinely portable
 * across a network boundary.
 */

export interface RepositoryHarness {
  projects: IProjectRepository;
  tasks: ITaskRepository;
}

const projectInput = (overrides: Partial<ProjectInput> = {}): ProjectInput => ({
  name: 'Project',
  description: '',
  color: 'blue',
  ...overrides,
});

const PROJECT_ID = '123e4567-e89b-42d3-a456-426614174000';

const taskInput = (overrides: Partial<TaskInput> = {}): TaskInput => ({
  projectId: PROJECT_ID,
  title: 'Task',
  description: '',
  status: 'todo',
  priority: 'medium',
  tags: [],
  ...overrides,
});

export const repositoryContract = (label: string, createHarness: () => RepositoryHarness): void => {
  describe(`IProjectRepository / ITaskRepository contract — ${label}`, () => {
    let harness: RepositoryHarness;

    beforeEach(() => {
      harness = createHarness();
    });

    describe('projects', () => {
      it('creates, reads back and lists projects sorted by name', async () => {
        await harness.projects.create(projectInput({ name: 'Zeta' }));
        await harness.projects.create(projectInput({ name: 'Alpha' }));

        const list = await harness.projects.list();
        expect(list.ok).toBe(true);
        if (!list.ok) return;
        expect(list.value.map((project) => project.name)).toEqual(['Alpha', 'Zeta']);
      });

      it('updates a project and bumps updatedAt', async () => {
        const created = await harness.projects.create(projectInput({ name: 'Before' }));
        expect(created.ok).toBe(true);
        if (!created.ok) return;

        const updated = await harness.projects.update(created.value.id, { name: 'After' });
        expect(updated.ok).toBe(true);
        if (!updated.ok) return;
        expect(updated.value.name).toBe('After');

        const fetched = await harness.projects.get(created.value.id);
        expect(fetched.ok && fetched.value.name).toBe('After');
      });

      it('returns a NOT_FOUND error for a missing project', async () => {
        const result = await harness.projects.get('missing');
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error.type).toBe('NOT_FOUND');
      });

      it('rejects invalid input with a VALIDATION_ERROR (no network round-trip needed)', async () => {
        const result = await harness.projects.create(projectInput({ name: '' }));
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error.type).toBe('VALIDATION_ERROR');
      });

      it('searches by name and description', async () => {
        await harness.projects.create(projectInput({ name: 'Alpha', description: '' }));
        await harness.projects.create(projectInput({ name: 'Beta', description: 'keyword' }));

        const result = await harness.projects.search('keyword');
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.map((project) => project.name)).toEqual(['Beta']);
      });

      it('soft-deletes, restores, then purges', async () => {
        const created = await harness.projects.create(projectInput({ name: 'Trash me' }));
        if (!created.ok) throw new Error('setup failed');
        const { id } = created.value;

        await harness.projects.delete(id);
        const active = await harness.projects.list();
        expect(active.ok && active.value).toHaveLength(0);

        const deleted = await harness.projects.listDeleted();
        expect(deleted.ok && deleted.value.map((project) => project.id)).toEqual([id]);

        const restored = await harness.projects.restore(id);
        expect(restored.ok).toBe(true);

        await harness.projects.delete(id);
        await harness.projects.purge(id);
        const afterPurge = await harness.projects.listDeleted();
        expect(afterPurge.ok && afterPurge.value).toHaveLength(0);
      });
    });

    describe('tasks', () => {
      it('creates and lists tasks for a project', async () => {
        await harness.tasks.create(taskInput({ title: 'One' }));
        await harness.tasks.create(taskInput({ title: 'Two' }));

        const list = await harness.tasks.list(PROJECT_ID);
        expect(list.ok).toBe(true);
        if (!list.ok) return;
        expect(list.value.map((task) => task.title).sort()).toEqual(['One', 'Two']);
      });

      it('pages, filters and sorts through listPage', async () => {
        await harness.tasks.create(taskInput({ title: 'A', status: 'todo' }));
        await harness.tasks.create(taskInput({ title: 'B', status: 'done' }));
        await harness.tasks.create(taskInput({ title: 'C', status: 'todo' }));

        const page = await harness.tasks.listPage({ status: 'todo', page: 1, pageSize: 1 });
        expect(page.ok).toBe(true);
        if (!page.ok) return;
        expect(page.value.total).toBe(2);
        expect(page.value.items).toHaveLength(1);
        expect(page.value.totalPages).toBe(2);
      });

      it('produces a summary of tags, active total and sub-task progress', async () => {
        const parent = await harness.tasks.create(taskInput({ title: 'Parent', tags: ['x'] }));
        if (!parent.ok) throw new Error('setup failed');
        await harness.tasks.create(
          taskInput({ title: 'Child', parentId: parent.value.id, tags: ['y'], status: 'done' })
        );

        const summary = await harness.tasks.summary();
        expect(summary.ok).toBe(true);
        if (!summary.ok) return;
        expect(summary.value.tags).toEqual(['x', 'y']);
        expect(summary.value.total).toBe(2);
        expect(summary.value.subtaskProgress.get(parent.value.id)).toEqual({ done: 1, total: 1 });
      });

      it('returns only active children of a parent', async () => {
        const parent = await harness.tasks.create(taskInput({ title: 'Parent' }));
        if (!parent.ok) throw new Error('setup failed');
        const child = await harness.tasks.create(
          taskInput({ title: 'Child', parentId: parent.value.id })
        );
        if (!child.ok) throw new Error('setup failed');

        const children = await harness.tasks.listChildren(parent.value.id);
        expect(children.ok && children.value.map((task) => task.id)).toEqual([child.value.id]);

        await harness.tasks.delete(child.value.id);
        const afterDelete = await harness.tasks.listChildren(parent.value.id);
        expect(afterDelete.ok && afterDelete.value).toHaveLength(0);
      });

      it('applies batch updates and batch moves to trash', async () => {
        const a = await harness.tasks.create(taskInput({ title: 'A' }));
        const b = await harness.tasks.create(taskInput({ title: 'B' }));
        if (!a.ok || !b.ok) throw new Error('setup failed');

        const updated = await harness.tasks.updateMany([a.value.id, b.value.id], {
          priority: 'urgent',
        });
        expect(updated.ok && updated.value.every((task) => task.priority === 'urgent')).toBe(true);

        const trashed = await harness.tasks.deleteMany([a.value.id, b.value.id]);
        expect(trashed.ok && trashed.value).toBe(2);

        const restored = await harness.tasks.restoreMany([a.value.id, b.value.id]);
        expect(restored.ok && restored.value).toBe(2);
      });
    });
  });
};
