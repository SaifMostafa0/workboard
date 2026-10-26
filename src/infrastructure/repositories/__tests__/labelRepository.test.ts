import { createStorageError } from '@/domain/errors';
import type { LabelInput } from '@/domain/label';
import { createLabelRepository } from '@/infrastructure/repositories/labelRepository';
import { FakeStorageAdapter } from '@/test/factories/fakeStorageAdapter';
import { beforeEach, describe, expect, it } from 'vitest';

const READ_ERROR = createStorageError('PERMISSION_DENIED', 'read failed');
const WRITE_ERROR = createStorageError('QUOTA_EXCEEDED', 'write failed');
const DELETE_ERROR = createStorageError('PERMISSION_DENIED', 'delete failed');

const labelInput = (name = 'Bug', color = '#e11d48'): LabelInput => ({ name, color });

describe('LocalLabelRepository', () => {
  let adapter: FakeStorageAdapter;
  let repository: ReturnType<typeof createLabelRepository>;

  beforeEach(() => {
    adapter = new FakeStorageAdapter();
    repository = createLabelRepository(adapter);
  });

  describe('list', () => {
    it('returns an empty list when no labels exist', async () => {
      const result = await repository.list();

      expect(result.ok && result.value).toEqual([]);
    });

    it('returns labels sorted by name', async () => {
      await repository.create(labelInput('Zebra'));
      await repository.create(labelInput('Alpha'));
      await repository.create(labelInput('Middle'));

      const result = await repository.list();

      expect(result.ok && result.value.map((label) => label.name)).toEqual([
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
    it('returns a stored label', async () => {
      const created = await repository.create(labelInput());
      if (!created.ok) throw new Error('setup failed');

      const result = await repository.get(created.value.id);

      expect(result.ok && result.value).toEqual(created.value);
    });

    it('returns NOT_FOUND for an unknown label', async () => {
      const result = await repository.get('missing-label');

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.type).toBe('NOT_FOUND');
    });

    it('propagates storage read errors', async () => {
      adapter.setFailMode('get', READ_ERROR);

      const result = await repository.get('any-label');

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toEqual(READ_ERROR);
    });
  });

  describe('create', () => {
    it('creates a label with generated id and timestamps', async () => {
      const result = await repository.create(labelInput());

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBeDefined();
        expect(result.value.name).toBe('Bug');
        expect(result.value.color).toBe('#e11d48');
        expect(result.value.createdAt).toBeDefined();
        expect(result.value.updatedAt).toBeDefined();
      }
    });

    it('propagates storage write errors', async () => {
      adapter.setFailMode('set', WRITE_ERROR);

      const result = await repository.create(labelInput());

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toEqual(WRITE_ERROR);
    });
  });

  describe('update', () => {
    it('merges a partial update and bumps updatedAt', async () => {
      const created = await repository.create(labelInput());
      if (!created.ok) throw new Error('setup failed');

      const result = await repository.update(created.value.id, {
        name: 'Regression',
        color: undefined,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.name).toBe('Regression');
        expect(result.value.color).toBeUndefined();
        expect(result.value.updatedAt).toBeDefined();
      }
    });

    it('returns NOT_FOUND for an unknown label', async () => {
      const result = await repository.update('missing-label', { name: 'Ghost' });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.type).toBe('NOT_FOUND');
    });

    it('propagates storage write errors', async () => {
      const created = await repository.create(labelInput());
      if (!created.ok) throw new Error('setup failed');
      adapter.setFailMode('set', WRITE_ERROR);

      const result = await repository.update(created.value.id, { name: 'Regression' });

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toEqual(WRITE_ERROR);
    });
  });

  describe('delete', () => {
    it('removes a label', async () => {
      const created = await repository.create(labelInput());
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

      const result = await repository.delete('any-label');

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toEqual(DELETE_ERROR);
    });
  });
});
