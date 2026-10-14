import type { DomainError, StorageError } from '@/domain/errors';
import { createNotFoundError } from '@/domain/errors';
import type { Project, ProjectInput, ProjectUpdate } from '@/domain/project';
import {
  safeValidateProjectInput,
  safeValidateProjectUpdate,
  zodErrorToValidationError,
} from '@/domain/validation';
import type { Result, StorageAdapter } from '@/infrastructure/storage/storageAdapter';
import {
  createCollectionPrefix,
  createStorageKey,
  err,
  ok,
} from '@/infrastructure/storage/storageAdapter';

export interface IProjectRepository {
  list(): Promise<Result<Project[], DomainError>>;
  listDeleted(): Promise<Result<Project[], DomainError>>;
  get(id: string): Promise<Result<Project, DomainError>>;
  create(input: ProjectInput): Promise<Result<Project, DomainError>>;
  update(id: string, update: ProjectUpdate): Promise<Result<Project, DomainError>>;
  /** Soft-delete: stamps `deletedAt` so the project can be restored. */
  delete(id: string): Promise<Result<void, DomainError>>;
  restore(id: string): Promise<Result<Project, DomainError>>;
  /** Hard-delete: removes the record permanently. */
  purge(id: string): Promise<Result<void, DomainError>>;
  search(query: string): Promise<Result<Project[], DomainError>>;
  count(): Promise<Result<number, DomainError>>;
}

const PROJECT_PREFIX = createCollectionPrefix('projects');

const toDomainError = (error: StorageError): DomainError => error;

export class LocalProjectRepository implements IProjectRepository {
  constructor(private readonly adapter: StorageAdapter) {}

  async list(): Promise<Result<Project[], DomainError>> {
    const result = await this.adapter.getAll<Project>(PROJECT_PREFIX);
    if (!result.ok) return err(toDomainError(result.error));
    return ok(
      result.value
        .filter((project) => !project.deletedAt)
        .sort((a, b) => a.name.localeCompare(b.name))
    );
  }

  async listDeleted(): Promise<Result<Project[], DomainError>> {
    const result = await this.adapter.getAll<Project>(PROJECT_PREFIX);
    if (!result.ok) return err(toDomainError(result.error));
    return ok(
      result.value
        .filter((project) => project.deletedAt)
        .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''))
    );
  }

  async get(id: string): Promise<Result<Project, DomainError>> {
    const key = createStorageKey('projects', id);
    const result = await this.adapter.get<Project>(key);
    if (!result.ok) return err(toDomainError(result.error));
    if (!result.value) return err(createNotFoundError('Project', id));
    return ok(result.value);
  }

  async create(input: ProjectInput): Promise<Result<Project, DomainError>> {
    const validation = safeValidateProjectInput(input);
    if (!validation.success) {
      return err(zodErrorToValidationError(validation.error));
    }

    const validatedInput = validation.data;
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const project: Project = {
      id,
      name: validatedInput.name,
      description: validatedInput.description,
      color: validatedInput.color,
      createdAt: now,
      updatedAt: now,
    };

    const key = createStorageKey('projects', id);
    const setResult = await this.adapter.set(key, project);
    if (!setResult.ok) return err(toDomainError(setResult.error));

    return ok(project);
  }

  async update(id: string, update: ProjectUpdate): Promise<Result<Project, DomainError>> {
    const getResult = await this.get(id);
    if (!getResult.ok) return getResult;

    const validation = safeValidateProjectUpdate(update);
    if (!validation.success) {
      return err(zodErrorToValidationError(validation.error));
    }

    const project = getResult.value;
    const updatedProject: Project = {
      ...project,
      ...validation.data,
      updatedAt: new Date().toISOString(),
    };

    const key = createStorageKey('projects', id);
    const setResult = await this.adapter.set(key, updatedProject);
    if (!setResult.ok) return err(toDomainError(setResult.error));

    return ok(updatedProject);
  }

  async delete(id: string): Promise<Result<void, DomainError>> {
    const getResult = await this.get(id);
    if (!getResult.ok) return getResult;

    const now = new Date().toISOString();
    const deletedProject: Project = { ...getResult.value, deletedAt: now, updatedAt: now };

    const key = createStorageKey('projects', id);
    const setResult = await this.adapter.set(key, deletedProject);
    if (!setResult.ok) return err(toDomainError(setResult.error));

    return ok(undefined);
  }

  async restore(id: string): Promise<Result<Project, DomainError>> {
    const getResult = await this.get(id);
    if (!getResult.ok) return getResult;

    const { deletedAt: _deletedAt, ...rest } = getResult.value;
    const restoredProject: Project = { ...rest, updatedAt: new Date().toISOString() };

    const key = createStorageKey('projects', id);
    const setResult = await this.adapter.set(key, restoredProject);
    if (!setResult.ok) return err(toDomainError(setResult.error));

    return ok(restoredProject);
  }

  async purge(id: string): Promise<Result<void, DomainError>> {
    const key = createStorageKey('projects', id);
    const deleteResult = await this.adapter.delete(key);
    if (!deleteResult.ok) return err(toDomainError(deleteResult.error));

    return ok(undefined);
  }

  async search(query: string): Promise<Result<Project[], DomainError>> {
    const listResult = await this.list();
    if (!listResult.ok) return listResult;

    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return ok(listResult.value);

    const filtered = listResult.value.filter(
      (project) =>
        project.name.toLowerCase().includes(lowerQuery) ||
        project.description.toLowerCase().includes(lowerQuery)
    );

    return ok(filtered);
  }

  async count(): Promise<Result<number, DomainError>> {
    const listResult = await this.list();
    if (!listResult.ok) return listResult;
    return ok(listResult.value.length);
  }
}

export const createProjectRepository = (adapter: StorageAdapter): IProjectRepository => {
  return new LocalProjectRepository(adapter);
};
