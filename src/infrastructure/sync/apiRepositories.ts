import type {
  IEpicRepository,
  ILabelRepository,
  IProjectRepository,
  ISavedViewRepository,
  ISettingsRepository,
  ITaskRepository,
} from '@/infrastructure/repositories';
import {
  createEpicRepository,
  createLabelRepository,
  createProjectRepository,
  createSavedViewRepository,
  createSettingsRepository,
  createTaskRepository,
} from '@/infrastructure/repositories';
import type { HttpClient } from './http';
import { createRemoteStorageAdapter } from './remoteStorageAdapter';

/**
 * "ApiRepository" factories (WB-201 spike).
 *
 * Each one mounts the *existing* local repository over a remote
 * `StorageAdapter`, so the returned object satisfies the exact `I*Repository`
 * interface the hooks already depend on — contract conformance is guaranteed by
 * construction rather than by a parallel implementation that could drift.
 *
 * Wiring these into the app is a one-line change per collection in
 * `src/hooks/useData.ts` (see `docs/decisions/0001-sync-architecture.md`); it is
 * deliberately **not** done here so local-only stays the default.
 */

export const createApiProjectRepository = (client: HttpClient): IProjectRepository =>
  createProjectRepository(createRemoteStorageAdapter(client));

export const createApiTaskRepository = (client: HttpClient): ITaskRepository =>
  createTaskRepository(createRemoteStorageAdapter(client));

export const createApiEpicRepository = (client: HttpClient): IEpicRepository =>
  createEpicRepository(createRemoteStorageAdapter(client));

export const createApiLabelRepository = (client: HttpClient): ILabelRepository =>
  createLabelRepository(createRemoteStorageAdapter(client));

export const createApiSavedViewRepository = (client: HttpClient): ISavedViewRepository =>
  createSavedViewRepository(createRemoteStorageAdapter(client));

export const createApiSettingsRepository = (client: HttpClient): ISettingsRepository =>
  createSettingsRepository(createRemoteStorageAdapter(client));
