import type { DomainError } from '@/domain/errors';
import { createNotFoundError } from '@/domain/errors';
import type { Label, LabelInput, LabelUpdate } from '@/domain/label';
import type { Result, StorageAdapter } from '@/infrastructure/storage/storageAdapter';
import {
  createCollectionPrefix,
  createStorageKey,
  err,
  ok,
} from '@/infrastructure/storage/storageAdapter';

export interface ILabelRepository {
  list(): Promise<Result<Label[], DomainError>>;
  get(id: string): Promise<Result<Label, DomainError>>;
  create(input: LabelInput): Promise<Result<Label, DomainError>>;
  update(id: string, update: LabelUpdate): Promise<Result<Label, DomainError>>;
  delete(id: string): Promise<Result<void, DomainError>>;
}

const LABEL_PREFIX = createCollectionPrefix('labels');

export class LocalLabelRepository implements ILabelRepository {
  constructor(private readonly adapter: StorageAdapter) {}

  async list(): Promise<Result<Label[], DomainError>> {
    const result = await this.adapter.getAll<Label>(LABEL_PREFIX);
    if (!result.ok) return err(result.error);
    return ok(result.value.sort((a, b) => a.name.localeCompare(b.name)));
  }

  async get(id: string): Promise<Result<Label, DomainError>> {
    const key = createStorageKey('labels', id);
    const result = await this.adapter.get<Label>(key);
    if (!result.ok) return err(result.error);
    if (!result.value) return err(createNotFoundError('Label', id));
    return ok(result.value);
  }

  async create(input: LabelInput): Promise<Result<Label, DomainError>> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const label: Label = { id, ...input, createdAt: now, updatedAt: now };
    const key = createStorageKey('labels', id);
    const setResult = await this.adapter.set(key, label);
    if (!setResult.ok) return err(setResult.error);
    return ok(label);
  }

  async update(id: string, update: LabelUpdate): Promise<Result<Label, DomainError>> {
    const getResult = await this.get(id);
    if (!getResult.ok) return getResult;
    const updated: Label = { ...getResult.value, ...update, updatedAt: new Date().toISOString() };
    const key = createStorageKey('labels', id);
    const setResult = await this.adapter.set(key, updated);
    if (!setResult.ok) return err(setResult.error);
    return ok(updated);
  }

  async delete(id: string): Promise<Result<void, DomainError>> {
    const key = createStorageKey('labels', id);
    const deleteResult = await this.adapter.delete(key);
    if (!deleteResult.ok) return err(deleteResult.error);
    return ok(undefined);
  }
}

export const createLabelRepository = (adapter: StorageAdapter): ILabelRepository =>
  new LocalLabelRepository(adapter);
