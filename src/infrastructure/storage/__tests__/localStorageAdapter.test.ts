import { beforeEach, describe, expect, it } from 'vitest';
import { localStorageAdapter } from '../localStorageAdapter';

describe('localStorageAdapter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores and reads values as JSON', async () => {
    const setResult = await localStorageAdapter.set('workboard:projects:1', {
      id: '1',
      name: 'Alpha',
    });
    expect(setResult.ok).toBe(true);

    const getResult = await localStorageAdapter.get<{ id: string; name: string }>(
      'workboard:projects:1'
    );
    expect(getResult.ok && getResult.value).toEqual({ id: '1', name: 'Alpha' });
  });

  it('returns null for a missing key', async () => {
    const result = await localStorageAdapter.get('workboard:projects:missing');
    expect(result.ok && result.value).toBeNull();
  });

  it('returns null for corrupt JSON instead of throwing', async () => {
    localStorage.setItem('workboard:projects:broken', '{not json');

    const result = await localStorageAdapter.get('workboard:projects:broken');
    expect(result.ok && result.value).toBeNull();
  });

  it('lists every value sharing a prefix', async () => {
    await localStorageAdapter.set('workboard:projects:1', { id: '1' });
    await localStorageAdapter.set('workboard:projects:2', { id: '2' });
    await localStorageAdapter.set('workboard:tasks:1', { id: 't1' });

    const result = await localStorageAdapter.getAll<{ id: string }>('workboard:projects:');
    expect(result.ok && result.value.map((value) => value.id).sort()).toEqual(['1', '2']);
  });

  it('deletes a single key', async () => {
    await localStorageAdapter.set('workboard:projects:1', { id: '1' });

    const deleteResult = await localStorageAdapter.delete('workboard:projects:1');

    expect(deleteResult.ok).toBe(true);
    const getResult = await localStorageAdapter.get('workboard:projects:1');
    expect(getResult.ok && getResult.value).toBeNull();
  });

  it('clears only the requested prefix', async () => {
    await localStorageAdapter.set('workboard:projects:1', { id: '1' });
    await localStorageAdapter.set('workboard:tasks:1', { id: 't1' });

    await localStorageAdapter.clear('workboard:projects:');

    const projects = await localStorageAdapter.getKeys('workboard:projects:');
    const tasks = await localStorageAdapter.getKeys('workboard:tasks:');
    expect(projects.ok && projects.value).toEqual([]);
    expect(tasks.ok && tasks.value).toHaveLength(1);
  });

  it('clears every workboard key when no prefix is given, leaving others alone', async () => {
    await localStorageAdapter.set('workboard:projects:1', { id: '1' });
    await localStorageAdapter.set('workboard:tasks:1', { id: 't1' });
    localStorage.setItem('other-app', 'keep me');

    await localStorageAdapter.clear();

    const keys = await localStorageAdapter.getKeys('workboard:');
    expect(keys.ok && keys.value).toEqual([]);
    expect(localStorage.getItem('other-app')).toBe('keep me');
  });

  it('reports an unsupported operation when localStorage is unavailable', async () => {
    const originalSetItem = window.localStorage.setItem;
    window.localStorage.setItem = () => {
      throw new DOMException('denied', 'SecurityError');
    };

    try {
      const result = await localStorageAdapter.get('workboard:projects:1');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.type).toBe('UNSUPPORTED_OPERATION');
    } finally {
      window.localStorage.setItem = originalSetItem;
    }
  });

  it('maps a quota error raised on write', async () => {
    const originalSetItem = window.localStorage.setItem;
    const throwingSetItem: typeof window.localStorage.setItem = (key, value) => {
      if (key === '__storage_test__') {
        originalSetItem.call(window.localStorage, key, value);
        return;
      }
      throw new DOMException('full', 'QuotaExceededError');
    };
    window.localStorage.setItem = throwingSetItem;

    try {
      const result = await localStorageAdapter.set('workboard:projects:1', { id: '1' });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.type).toBe('QUOTA_EXCEEDED');
    } finally {
      window.localStorage.setItem = originalSetItem;
    }
  });
});
