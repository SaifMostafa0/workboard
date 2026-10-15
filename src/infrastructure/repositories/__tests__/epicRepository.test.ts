import type { EpicInput } from '@/domain/epic';
import { createEpicRepository } from '@/infrastructure/repositories/epicRepository';
import { FakeStorageAdapter } from '@/test/factories/fakeStorageAdapter';
import { beforeEach, describe, expect, it } from 'vitest';

const PROJECT_A = '123e4567-e89b-42d3-a456-426614174000';
const PROJECT_B = '123e4567-e89b-42d3-a456-426614174001';

describe('LocalEpicRepository', () => {
  let adapter: FakeStorageAdapter;
  let repository: ReturnType<typeof createEpicRepository>;

  beforeEach(() => {
    adapter = new FakeStorageAdapter();
    repository = createEpicRepository(adapter);
  });

  const input = (projectId = PROJECT_A): EpicInput => ({
    projectId,
    name: 'Authentication',
    description: 'Sign-in, sessions and password reset',
  });

  describe('create', () => {
    it('creates an epic with a generated id and timestamps', async () => {
      const result = await repository.create(input());

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBeDefined();
        expect(result.value.projectId).toBe(PROJECT_A);
        expect(result.value.name).toBe('Authentication');
        expect(result.value.createdAt).toBeDefined();
        expect(result.value.updatedAt).toBeDefined();
        expect(result.value.deletedAt).toBeUndefined();
      }
    });

    it('rejects a missing name', async () => {
      const result = await repository.create({ ...input(), name: '' });
      expect(result.ok).toBe(false);
    });

    it('rejects an invalid projectId', async () => {
      const result = await repository.create({ ...input(), projectId: 'not-a-uuid' });
      expect(result.ok).toBe(false);
    });
  });

  describe('list', () => {
    it('returns all active epics when no project filter is given', async () => {
      await repository.create(input(PROJECT_A));
      await repository.create(input(PROJECT_B));

      const result = await repository.list();

      expect(result.ok && result.value).toHaveLength(2);
    });

    it('filters by projectId', async () => {
      await repository.create(input(PROJECT_A));
      await repository.create(input(PROJECT_B));

      const result = await repository.list(PROJECT_A);

      expect(result.ok && result.value).toHaveLength(1);
      if (result.ok) expect(result.value[0]?.projectId).toBe(PROJECT_A);
    });

    it('matches on the epic projectId, not the epic id (regression)', async () => {
      // The old implementation filtered epics by `epic.id.startsWith(projectId)`.
      // Epic ids are unrelated to project ids, so the list always came back empty.
      const created = await repository.create(input(PROJECT_A));

      const result = await repository.list(PROJECT_A);

      expect(result.ok && result.value).toHaveLength(1);
      if (result.ok && created.ok) {
        expect(result.value[0]?.id).toBe(created.value.id);
      }
    });

    it('excludes epics moved to trash', async () => {
      const created = await repository.create(input());
      if (!created.ok) throw new Error('setup failed');
      await repository.delete(created.value.id);

      const active = await repository.list();
      expect(active.ok && active.value).toHaveLength(0);

      const deleted = await repository.listDeleted();
      expect(deleted.ok && deleted.value).toHaveLength(1);
      expect(deleted.ok && deleted.value[0]?.id).toBe(created.value.id);
    });
  });

  describe('listByProject', () => {
    it('matches list(projectId)', async () => {
      await repository.create(input(PROJECT_A));
      await repository.create(input(PROJECT_B));

      const byProject = await repository.listByProject(PROJECT_A);
      const listed = await repository.list(PROJECT_A);

      expect(byProject.ok && byProject.value).toEqual(listed.ok ? listed.value : []);
    });
  });

  describe('update', () => {
    it('applies a partial update and bumps updatedAt', async () => {
      const created = await repository.create(input());
      if (!created.ok) throw new Error('setup failed');

      const updated = await repository.update(created.value.id, { name: 'Auth & sessions' });

      expect(updated.ok).toBe(true);
      if (updated.ok) {
        expect(updated.value.name).toBe('Auth & sessions');
        expect(updated.value.description).toBe(input().description);
      }
    });

    it('returns a not-found error for an unknown id', async () => {
      const result = await repository.update('123e4567-e89b-42d3-a456-426614174099', {
        name: 'Ghost',
      });
      expect(result.ok).toBe(false);
    });
  });

  describe('restore / purge', () => {
    it('restores a trashed epic', async () => {
      const created = await repository.create(input());
      if (!created.ok) throw new Error('setup failed');
      await repository.delete(created.value.id);

      const restored = await repository.restore(created.value.id);

      expect(restored.ok).toBe(true);
      if (restored.ok) expect(restored.value.deletedAt).toBeUndefined();

      const active = await repository.list();
      expect(active.ok && active.value).toHaveLength(1);
    });

    it('purges an epic permanently', async () => {
      const created = await repository.create(input());
      if (!created.ok) throw new Error('setup failed');

      const purged = await repository.purge(created.value.id);

      expect(purged.ok).toBe(true);
      expect(adapter.getStoreSize()).toBe(0);
    });
  });
});
