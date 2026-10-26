import { createStorageError } from '@/domain/errors';
import type { SavedViewInput } from '@/domain/savedView';
import { createSavedViewRepository } from '@/infrastructure/repositories/savedViewRepository';
import { FakeStorageAdapter } from '@/test/factories/fakeStorageAdapter';
import { beforeEach, describe, expect, it } from 'vitest';

const READ_ERROR = createStorageError('PERMISSION_DENIED', 'read failed');
const WRITE_ERROR = createStorageError('QUOTA_EXCEEDED', 'write failed');
const DELETE_ERROR = createStorageError('PERMISSION_DENIED', 'delete failed');

const viewInput = (name = 'My work', status = 'todo'): SavedViewInput => ({
  name,
  filters: { status, tags: ['frontend'] },
});

describe('LocalSavedViewRepository', () => {
  let adapter: FakeStorageAdapter;
  let repository: ReturnType<typeof createSavedViewRepository>;

  beforeEach(() => {
    adapter = new FakeStorageAdapter();
    repository = createSavedViewRepository(adapter);
  });

  describe('list', () => {
    it('returns an empty list when no saved views exist', async () => {
      const result = await repository.list();

      expect(result.ok && result.value).toEqual([]);
    });

    it('returns saved views sorted by name', async () => {
      await repository.create(viewInput('Zebra'));
      await repository.create(viewInput('Alpha'));
      await repository.create(viewInput('Middle'));

      const result = await repository.list();

      expect(result.ok && result.value.map((view) => view.name)).toEqual([
        'Alpha',
        'Middle',
        'Zebra',
      ]);
    });

    it('propagates storage read errors', async () => {
      adapter.setFailMode('getAll', READ_ERROR);

      const result = await repository.list();

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toEqual(READ_ERROR);
    });
  });

  describe('get', () => {
    it('returns a stored saved view', async () => {
      const created = await repository.create(viewInput());
      if (!created.ok) throw new Error('setup failed');

      const result = await repository.get(created.value.id);

      expect(result.ok && result.value).toEqual(created.value);
    });

    it('returns NOT_FOUND for an unknown saved view', async () => {
      const result = await repository.get('missing-view');

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.type).toBe('NOT_FOUND');
    });

    it('propagates storage read errors', async () => {
      adapter.setFailMode('get', READ_ERROR);

      const result = await repository.get('any-view');

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toEqual(READ_ERROR);
    });
  });

  describe('create', () => {
    it('creates a saved view with generated id and timestamps', async () => {
      const result = await repository.create(viewInput());

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBeDefined();
        expect(result.value.name).toBe('My work');
        expect(result.value.filters).toEqual({ status: 'todo', tags: ['frontend'] });
        expect(result.value.createdAt).toBeDefined();
        expect(result.value.updatedAt).toBeDefined();
      }
    });

    it('propagates storage write errors', async () => {
      adapter.setFailMode('set', WRITE_ERROR);

      const result = await repository.create(viewInput());

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toEqual(WRITE_ERROR);
    });
  });

  describe('update', () => {
    it('merges a partial update and bumps updatedAt', async () => {
      const created = await repository.create(viewInput());
      if (!created.ok) throw new Error('setup failed');

      const result = await repository.update(created.value.id, {
        name: 'Blocked work',
        filters: { blocked: 'true' },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe('Blocked work');
        expect(result.value.filters).toEqual({ blocked: 'true' });
        expect(result.value.updatedAt).toBeDefined();
      }
    });

    it('returns NOT_FOUND for an unknown saved view', async () => {
      const result = await repository.update('missing-view', { name: 'Ghost' });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.type).toBe('NOT_FOUND');
    });

    it('propagates storage write errors', async () => {
      const created = await repository.create(viewInput());
      if (!created.ok) throw new Error('setup failed');
      adapter.setFailMode('set', WRITE_ERROR);

      const result = await repository.update(created.value.id, { name: 'Blocked work' });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toEqual(WRITE_ERROR);
    });
  });

  describe('delete', () => {
    it('removes a saved view', async () => {
      const created = await repository.create(viewInput());
      if (!created.ok) throw new Error('setup failed');

      const result = await repository.delete(created.value.id);

      expect(result.ok).toBe(true);
      expect(await repository.get(created.value.id)).toMatchObject({
        ok: false,
        error: { type: 'NOT_FOUND' },
      });
    });

    it('propagates storage delete errors', async () => {
      adapter.setFailMode('delete', DELETE_ERROR);

      const result = await repository.delete('any-view');

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toEqual(DELETE_ERROR);
    });
  });
});
