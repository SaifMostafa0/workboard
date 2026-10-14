import type { DomainError } from '@/domain/errors';
import { createStorageError } from '@/domain/errors';
import type { Result, StorageAdapter } from '@/infrastructure/storage/storageAdapter';
import { createStorageKey, err, ok } from '@/infrastructure/storage/storageAdapter';

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  pageSize: number;
  sidebarCollapsed: boolean;
  showCompletedTasks: boolean;
  compactMode: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  pageSize: 20,
  sidebarCollapsed: false,
  showCompletedTasks: true,
  compactMode: false,
};

export interface ISettingsRepository {
  get(): Promise<Result<UserSettings, DomainError>>;
  update(settings: Partial<UserSettings>): Promise<Result<UserSettings, DomainError>>;
  reset(): Promise<Result<UserSettings, DomainError>>;
}

const SETTINGS_KEY = createStorageKey('settings', 'preferences');

export class LocalSettingsRepository implements ISettingsRepository {
  constructor(private readonly adapter: StorageAdapter) {}

  async get(): Promise<Result<UserSettings, DomainError>> {
    const result = await this.adapter.get<UserSettings>(SETTINGS_KEY);
    if (!result.ok)
      return err(createStorageError(result.error.type, result.error.message, result.error));
    if (!result.value) return ok(DEFAULT_SETTINGS);

    // Merge with defaults to handle new settings
    return ok({ ...DEFAULT_SETTINGS, ...result.value });
  }

  async update(settings: Partial<UserSettings>): Promise<Result<UserSettings, DomainError>> {
    const currentResult = await this.get();
    if (!currentResult.ok) return currentResult;

    const updated = { ...currentResult.value, ...settings };
    const setResult = await this.adapter.set(SETTINGS_KEY, updated);
    if (!setResult.ok)
      return err(
        createStorageError(setResult.error.type, setResult.error.message, setResult.error)
      );

    return ok(updated);
  }

  async reset(): Promise<Result<UserSettings, DomainError>> {
    const deleteResult = await this.adapter.delete(SETTINGS_KEY);
    if (!deleteResult.ok)
      return err(
        createStorageError(deleteResult.error.type, deleteResult.error.message, deleteResult.error)
      );
    return ok(DEFAULT_SETTINGS);
  }
}

export const createSettingsRepository = (adapter: StorageAdapter): ISettingsRepository => {
  return new LocalSettingsRepository(adapter);
};
