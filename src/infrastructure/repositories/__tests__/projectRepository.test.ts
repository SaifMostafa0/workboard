import { createStorageError } from '@/domain/errors';
import type { ProjectColor, ProjectInput } from '@/domain/project';
import { createProjectRepository } from '@/infrastructure/repositories/projectRepository';
import { FakeStorageAdapter } from '@/test/factories/fakeStorageAdapter';
import { beforeEach, describe, expect, it } from 'vitest';

describe('LocalProjectRepository', () => {
  let adapter: FakeStorageAdapter;
  let repository: ReturnType<typeof createProjectRepository>;

  beforeEach(() => {
    adapter = new FakeStorageAdapter();
    repository = createProjectRepository(adapter);
  });

  describe('create', () => {
    it('creates a project with generated ID and timestamps', async () => {
      const input: ProjectInput = {
        name: 'Test Project',
        description: 'Description',
        color: 'blue',
      };

      const result = await repository.create(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBeDefined();
        expect(result.value.name).toBe('Test Project');
        expect(result.value.description).toBe('Description');
        expect(result.value.color).toBe('blue');
        expect(result.value.createdAt).toBeDefined();
        expect(result.value.updatedAt).toBeDefined();
      }
    });

    it('stores project in storage', async () => {
      const input: ProjectInput = { name: 'Test', description: '', color: 'blue' };
      const result = await repository.create(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const stored = await adapter.get(`workboard:projects:${result.value.id}`);
        expect(stored.ok).toBe(true);
        if (stored.ok) {
          expect(stored.value).toEqual(result.value);
        }
      }
    });

    it('rejects invalid input', async () => {
      const result = await repository.create({ name: '', description: '', color: 'blue' });
      expect(result.ok).toBe(false);
    });

    it('rejects invalid color', async () => {
      const result = await repository.create({
        name: 'Test',
        description: '',
        color: 'invalid' as ProjectColor,
      });
      expect(result.ok).toBe(false);
    });
  });

  describe('get', () => {
    it('returns project by ID', async () => {
      const createResult = await repository.create({
        name: 'Test',
        description: '',
        color: 'blue',
      });
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const result = await repository.get(createResult.value.id);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe(createResult.value.id);
        expect(result.value.name).toBe('Test');
      }
    });

    it('returns NOT_FOUND for non-existent ID', async () => {
      const result = await repository.get('non-existent-id');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('NOT_FOUND');
      }
    });
  });

  describe('list', () => {
    it('returns all projects sorted by name', async () => {
      await repository.create({ name: 'Z Project', description: '', color: 'blue' });
      await repository.create({ name: 'A Project', description: '', color: 'red' });
      await repository.create({ name: 'M Project', description: '', color: 'green' });

      const result = await repository.list();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(3);
        expect(result.value.map((p) => p.name)).toEqual(['A Project', 'M Project', 'Z Project']);
      }
    });

    it('returns empty array when no projects', async () => {
      const result = await repository.list();
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toEqual([]);
    });
  });

  describe('update', () => {
    it('updates project fields', async () => {
      const createResult = await repository.create({
        name: 'Original',
        description: '',
        color: 'blue',
      });
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      // Small delay to ensure updatedAt changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result = await repository.update(createResult.value.id, {
        name: 'Updated',
        color: 'red',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe('Updated');
        expect(result.value.color).toBe('red');
        expect(result.value.updatedAt).not.toBe(createResult.value.updatedAt);
      }
    });

    it('preserves unchanged fields', async () => {
      const createResult = await repository.create({
        name: 'Test',
        description: 'Desc',
        color: 'blue',
      });
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const result = await repository.update(createResult.value.id, { name: 'Updated' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.description).toBe('Desc');
        expect(result.value.color).toBe('blue');
      }
    });

    it('returns NOT_FOUND for non-existent ID', async () => {
      const result = await repository.update('non-existent', { name: 'Test' });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.type).toBe('NOT_FOUND');
    });

    it('rejects invalid update data', async () => {
      const createResult = await repository.create({
        name: 'Test',
        description: '',
        color: 'blue',
      });
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const result = await repository.update(createResult.value.id, { name: '' });
      expect(result.ok).toBe(false);
    });
  });

  describe('delete', () => {
    it('deletes project', async () => {
      const createResult = await repository.create({
        name: 'Test',
        description: '',
        color: 'blue',
      });
      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const result = await repository.delete(createResult.value.id);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const getResult = await repository.get(createResult.value.id);
        expect(getResult.ok).toBe(false);
      }
    });

    it('returns NOT_FOUND for non-existent ID', async () => {
      const result = await repository.delete('non-existent');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.type).toBe('NOT_FOUND');
    });
  });

  describe('search', () => {
    it('searches by name', async () => {
      await repository.create({ name: 'Alpha Project', description: '', color: 'blue' });
      await repository.create({ name: 'Beta Project', description: '', color: 'red' });
      await repository.create({ name: 'Gamma Task', description: '', color: 'green' });

      const result = await repository.search('Project');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value.map((p) => p.name)).toContain('Alpha Project');
        expect(result.value.map((p) => p.name)).toContain('Beta Project');
      }
    });

    it('searches by description', async () => {
      await repository.create({ name: 'Project', description: 'Contains keyword', color: 'blue' });
      await repository.create({ name: 'Other', description: 'Nothing here', color: 'red' });

      const result = await repository.search('keyword');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(1);
        expect(result.value[0]?.name).toBe('Project');
      }
    });

    it('is case insensitive', async () => {
      await repository.create({ name: 'Test Project', description: '', color: 'blue' });

      const result = await repository.search('test');

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toHaveLength(1);
    });

    it('returns all when query is empty', async () => {
      await repository.create({ name: 'Test', description: '', color: 'blue' });

      const result = await repository.search('');

      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toHaveLength(1);
    });
  });

  describe('count', () => {
    it('returns correct count', async () => {
      const empty = await repository.count();
      expect(empty.ok && empty.value).toBe(0);
      await repository.create({ name: 'Test 1', description: '', color: 'blue' });
      const afterFirst = await repository.count();
      expect(afterFirst.ok && afterFirst.value).toBe(1);
      await repository.create({ name: 'Test 2', description: '', color: 'red' });
      const afterSecond = await repository.count();
      expect(afterSecond.ok && afterSecond.value).toBe(2);
    });
  });

  describe('storage errors', () => {
    it('propagates storage errors', async () => {
      adapter.setFailMode('get', createStorageError('QUOTA_EXCEEDED', 'Quota exceeded'));

      const result = await repository.get('any-id');

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.type).toBe('QUOTA_EXCEEDED');
    });
  });
});
