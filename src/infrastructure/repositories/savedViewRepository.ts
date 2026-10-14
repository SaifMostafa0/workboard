import type { DomainError } from '@/domain/errors';
import { createNotFoundError } from '@/domain/errors';
import type { SavedView, SavedViewInput, SavedViewUpdate } from '@/domain/savedView';
import type { Result, StorageAdapter } from '@/infrastructure/storage/storageAdapter';
import {
  createCollectionPrefix,
  createStorageKey,
  err,
  ok,
} from '@/infrastructure/storage/storageAdapter';

export interface ISavedViewRepository {
  list(): Promise<Result<SavedView[], DomainError>>;
  get(id: string): Promise<Result<SavedView, DomainError>>;
  create(input: SavedViewInput): Promise<Result<SavedView, DomainError>>;
  update(id: string, update: SavedViewUpdate): Promise<Result<SavedView, DomainError>>;
  delete(id: string): Promise<Result<void, DomainError>>;
}

const SAVED_VIEW_PREFIX = createCollectionPrefix('savedViews');

export class LocalSavedViewRepository implements ISavedViewRepository {
  constructor(private readonly adapter: StorageAdapter) {}

  async list(): Promise<Result<SavedView[], DomainError>> {
    const result = await this.adapter.getAll<SavedView>(SAVED_VIEW_PREFIX);
    if (!result.ok) return err(result.error);
    return ok(result.value.sort((a, b) => a.name.localeCompare(b.name)));
  }

  async get(id: string): Promise<Result<SavedView, DomainError>> {
    const key = createStorageKey('savedViews', id);
    const result = await this.adapter.get<SavedView>(key);
    if (!result.ok) return err(result.error);
    if (!result.value) return err(createNotFoundError('SavedView', id));
    return ok(result.value);
  }

  async create(input: SavedViewInput): Promise<Result<SavedView, DomainError>> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const view: SavedView = { id, ...input, createdAt: now, updatedAt: now };
    const key = createStorageKey('savedViews', id);
    const setResult = await this.adapter.set(key, view);
    if (!setResult.ok) return err(setResult.error);
    return ok(view);
  }

  async update(id: string, update: SavedViewUpdate): Promise<Result<SavedView, DomainError>> {
    const getResult = await this.get(id);
    if (!getResult.ok) return getResult;
    const updated: SavedView = {
      ...getResult.value,
      ...update,
      updatedAt: new Date().toISOString(),
    };
    const key = createStorageKey('savedViews', id);
    const setResult = await this.adapter.set(key, updated);
    if (!setResult.ok) return err(setResult.error);
    return ok(updated);
  }

  async delete(id: string): Promise<Result<void, DomainError>> {
    const key = createStorageKey('savedViews', id);
    const deleteResult = await this.adapter.delete(key);
    if (!deleteResult.ok) return err(deleteResult.error);
    return ok(undefined);
  }
}

export const createSavedViewRepository = (adapter: StorageAdapter): ISavedViewRepository =>
  new LocalSavedViewRepository(adapter);
