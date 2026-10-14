import { createStorageError } from '@/domain/errors';
import { createFakeAdapter } from '@/test/factories/fakeStorageAdapter';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserSettings } from '../settingsRepository';
import {
  DEFAULT_SETTINGS,
  LocalSettingsRepository,
  createSettingsRepository,
} from '../settingsRepository';

describe('LocalSettingsRepository', () => {
  let adapter: ReturnType<typeof createFakeAdapter>;
  let repo: LocalSettingsRepository;

  beforeEach(() => {
    adapter = createFakeAdapter();
    repo = new LocalSettingsRepository(adapter);
  });

  describe('get', () => {
    it('returns default settings when storage is empty', async () => {
      const result = await repo.get();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(DEFAULT_SETTINGS);
      }
    });

    it('merges stored settings with defaults for new properties', async () => {
      // Store partial settings (missing new properties like showCompletedTasks, compactMode)
      const partial: Partial<UserSettings> = { theme: 'dark', pageSize: 50 };
      await adapter.set('workboard:settings:preferences', partial);

      const result = await repo.get();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({
          ...DEFAULT_SETTINGS,
          theme: 'dark',
          pageSize: 50,
        });
      }
    });

    it('preserves all stored values when they match defaults shape', async () => {
      const custom: UserSettings = {
        theme: 'light',
        pageSize: 10,
        sidebarCollapsed: true,
        showCompletedTasks: false,
        compactMode: true,
      };
      await adapter.set('workboard:settings:preferences', custom);

      const result = await repo.get();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(custom);
      }
    });

    it('returns storage error when adapter fails', async () => {
      // Override adapter to simulate error
      adapter.get = vi.fn().mockResolvedValue({
        ok: false as const,
        error: createStorageError('NOT_FOUND', 'Storage error'),
      });

      const result = await repo.get();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatchObject({ code: 'STORAGE_ERROR' });
      }
    });
  });

  describe('update', () => {
    it('updates existing settings', async () => {
      const result = await repo.update({ theme: 'dark' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.theme).toBe('dark');
        expect(result.value.pageSize).toBe(DEFAULT_SETTINGS.pageSize);
      }
    });

    it('merges updates with current settings', async () => {
      // Set initial values
      await repo.update({ theme: 'light', pageSize: 25 });

      const result = await repo.update({ theme: 'dark' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.theme).toBe('dark');
        expect(result.value.pageSize).toBe(25);
      }
    });

    it('allows multiple properties update', async () => {
      const updates: Partial<UserSettings> = {
        theme: 'dark',
        pageSize: 100,
        sidebarCollapsed: true,
        compactMode: true,
      };
      const result = await repo.update(updates);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.theme).toBe('dark');
        expect(result.value.pageSize).toBe(100);
        expect(result.value.sidebarCollapsed).toBe(true);
        expect(result.value.compactMode).toBe(true);
        expect(result.value.showCompletedTasks).toBe(DEFAULT_SETTINGS.showCompletedTasks);
      }
    });

    it('returns error if get fails', async () => {
      adapter.get = vi.fn().mockResolvedValue({
        ok: false as const,
        error: createStorageError('NOT_FOUND', 'Failed to get'),
      });

      const result = await repo.update({ theme: 'dark' });
      expect(result.ok).toBe(false);
    });

    it('returns error if set fails', async () => {
      adapter.set = vi.fn().mockResolvedValue({
        ok: false as const,
        error: createStorageError('QUOTA_EXCEEDED', 'Quota exceeded'),
      });

      const result = await repo.update({ theme: 'dark' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatchObject({ code: 'STORAGE_ERROR' });
      }
    });
  });

  describe('reset', () => {
    it('resets settings to defaults', async () => {
      // First update to custom values
      await repo.update({
        theme: 'dark',
        pageSize: 50,
        sidebarCollapsed: true,
      });

      // Then reset
      const result = await repo.reset();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(DEFAULT_SETTINGS);
      }

      // Verify persisted
      const getResult = await repo.get();
      expect(getResult.ok).toBe(true);
      if (getResult.ok) {
        expect(getResult.value).toEqual(DEFAULT_SETTINGS);
      }
    });

    it('returns error if delete fails', async () => {
      adapter.delete = vi.fn().mockResolvedValue({
        ok: false as const,
        error: createStorageError('NOT_FOUND', 'Delete failed'),
      });

      const result = await repo.reset();
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatchObject({ code: 'STORAGE_ERROR' });
      }
    });
  });

  describe('createSettingsRepository factory', () => {
    it('creates a repository instance', () => {
      const factoryRepo = createSettingsRepository(adapter);
      expect(factoryRepo).toBeInstanceOf(LocalSettingsRepository);
    });

    it('factory repo works correctly', async () => {
      const factoryRepo = createSettingsRepository(adapter);
      const result = await factoryRepo.get();
      expect(result.ok).toBe(true);
    });
  });
});
