import type { Epic, EpicInput, EpicUpdate } from '@/domain/epic';
import type { DomainError } from '@/domain/errors';
import { createNotFoundError } from '@/domain/errors';
import type { Result, StorageAdapter } from '@/infrastructure/storage/storageAdapter';
import {
  createCollectionPrefix,
  createStorageKey,
  err,
  ok,
} from '@/infrastructure/storage/storageAdapter';

export interface IEpicRepository {
  list(projectId?: string): Promise<Result<Epic[], DomainError>>;
  listDeleted(): Promise<Result<Epic[], DomainError>>;
  get(id: string): Promise<Result<Epic, DomainError>>;
  create(input: EpicInput): Promise<Result<Epic, DomainError>>;
  update(id: string, update: EpicUpdate): Promise<Result<Epic, DomainError>>;
  delete(id: string): Promise<Result<void, DomainError>>;
  restore(id: string): Promise<Result<Epic, DomainError>>;
  purge(id: string): Promise<Result<void, DomainError>>;
  listByProject(projectId: string): Promise<Result<Epic[], DomainError>>;
}

const EPIC_PREFIX = createCollectionPrefix('epics');

export class LocalEpicRepository implements IEpicRepository {
  constructor(private readonly adapter: StorageAdapter) {}

  async list(projectId?: string): Promise<Result<Epic[], DomainError>> {
    const result = await this.adapter.getAll<Epic>(EPIC_PREFIX);
    if (!result.ok) return err(result.error);
    const active = result.value.filter((e) => !e.deletedAt);
    if (projectId) {
      return ok(active.filter((e) => e.id.startsWith(projectId)));
    }
    return ok(active);
  }

  async listDeleted(): Promise<Result<Epic[], DomainError>> {
    const result = await this.adapter.getAll<Epic>(EPIC_PREFIX);
    if (!result.ok) return err(result.error);
    return ok(result.value.filter((e) => e.deletedAt));
  }

  async get(id: string): Promise<Result<Epic, DomainError>> {
    const key = createStorageKey('epics', id);
    const result = await this.adapter.get<Epic>(key);
    if (!result.ok) return err(result.error);
    if (!result.value) return err(createNotFoundError('Epic', id));
    return ok(result.value);
  }

  async create(input: EpicInput): Promise<Result<Epic, DomainError>> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const epic: Epic = { id, ...input, createdAt: now, updatedAt: now };
    const key = createStorageKey('epics', id);
    const setResult = await this.adapter.set(key, epic);
    if (!setResult.ok) return err(setResult.error);
    return ok(epic);
  }

  async update(id: string, update: EpicUpdate): Promise<Result<Epic, DomainError>> {
    const getResult = await this.get(id);
    if (!getResult.ok) return getResult;
    const updated: Epic = { ...getResult.value, ...update, updatedAt: new Date().toISOString() };
    const key = createStorageKey('epics', id);
    const setResult = await this.adapter.set(key, updated);
    if (!setResult.ok) return err(setResult.error);
    return ok(updated);
  }

  async delete(id: string): Promise<Result<void, DomainError>> {
    const getResult = await this.get(id);
    if (!getResult.ok) return getResult;

    const now = new Date().toISOString();
    const deletedEpic: Epic = { ...getResult.value, deletedAt: now, updatedAt: now };

    const key = createStorageKey('epics', id);
    const setResult = await this.adapter.set(key, deletedEpic);
    if (!setResult.ok) return err(setResult.error);

    return ok(undefined);
  }

  async restore(id: string): Promise<Result<Epic, DomainError>> {
    const getResult = await this.get(id);
    if (!getResult.ok) return getResult;

    const { deletedAt: _deletedAt, ...rest } = getResult.value;
    const restoredEpic: Epic = { ...rest, updatedAt: new Date().toISOString() };

    const key = createStorageKey('epics', id);
    const setResult = await this.adapter.set(key, restoredEpic);
    if (!setResult.ok) return err(setResult.error);

    return ok(restoredEpic);
  }

  async purge(id: string): Promise<Result<void, DomainError>> {
    const key = createStorageKey('epics', id);
    const deleteResult = await this.adapter.delete(key);
    if (!deleteResult.ok) return err(deleteResult.error);
    return ok(undefined);
  }

  async listByProject(projectId: string): Promise<Result<Epic[], DomainError>> {
    const result = await this.list(projectId);
    if (!result.ok) return result;
    return ok(result.value.filter((e) => e.id.startsWith(projectId)));
  }
}

export const createEpicRepository = (adapter: StorageAdapter): IEpicRepository =>
  new LocalEpicRepository(adapter);
