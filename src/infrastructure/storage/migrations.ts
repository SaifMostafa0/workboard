import type { Epic, Label, Project, SavedView, Task } from '@/domain';
import type { StorageError, ValidationError } from '@/domain/errors';
import type { ExportDataValidated, ImportDataValidated } from '@/domain/validation';
import {
  validateExportData,
  validateImportData,
  validateImportRelationships,
} from '@/domain/validation';
import { createDemoData } from './demoData';
import type { Result, StorageAdapter } from './storageAdapter';
import { createStorageKey, err, ok } from './storageAdapter';

const SCHEMA_VERSION_KEY = 'workboard:meta:schema';
const SEEDED_KEY = 'workboard:meta:seeded';
const CURRENT_SCHEMA_VERSION = 1;

const PROJECT_PREFIX = 'workboard:projects:';
const TASK_PREFIX = 'workboard:tasks:';
const LABEL_PREFIX = 'workboard:labels:';
const SAVED_VIEW_PREFIX = 'workboard:savedViews:';
const EPIC_PREFIX = 'workboard:epics:';
const SETTINGS_PREFIX = 'workboard:settings:';
const SETTINGS_KEY = 'workboard:settings:preferences';

export interface StoredProject extends Project {
  _version?: number;
}

export interface StoredTask extends Task {
  _version?: number;
}

/** Counts of records written by an import, for user-facing feedback. */
export interface ImportResult {
  projectsCreated: number;
  tasksCreated: number;
  labelsCreated: number;
  savedViewsCreated: number;
  epicsCreated: number;
}

export interface MigrationContext {
  adapter: StorageAdapter;
  version: number;
}

type MigrationFn = (context: MigrationContext) => Promise<Result<void, StorageError>>;

const migrations: MigrationFn[] = [
  // Version 0 -> 1: Initial schema
  async (_context) => {
    // No migration needed for initial version
    return ok(undefined);
  },
];

export const getSchemaVersion = async (
  adapter: StorageAdapter
): Promise<Result<number, StorageError>> => {
  const result = await adapter.get<number>(SCHEMA_VERSION_KEY);
  if (!result.ok) return result;
  return ok(result.value ?? 0);
};

export const setSchemaVersion = async (
  adapter: StorageAdapter,
  version: number
): Promise<Result<void, StorageError>> => {
  return adapter.set(SCHEMA_VERSION_KEY, version);
};

export const runMigrations = async (
  adapter: StorageAdapter
): Promise<Result<void, StorageError>> => {
  const versionResult = await getSchemaVersion(adapter);
  if (!versionResult.ok) return versionResult;

  let currentVersion = versionResult.value;

  for (let i = currentVersion; i < migrations.length; i++) {
    const migration = migrations[i];
    if (!migration) continue;
    const context: MigrationContext = { adapter, version: i };
    const result = await migration(context);
    if (!result.ok) return result;
    currentVersion = i + 1;
    const versionSetResult = await setSchemaVersion(adapter, currentVersion);
    if (!versionSetResult.ok) return versionSetResult;
  }

  return ok(undefined);
};

export const exportAllData = async (
  adapter: StorageAdapter
): Promise<Result<ExportDataValidated, StorageError>> => {
  const projectsResult = await adapter.getAll<StoredProject>(PROJECT_PREFIX);
  if (!projectsResult.ok) return projectsResult;

  const tasksResult = await adapter.getAll<StoredTask>(TASK_PREFIX);
  if (!tasksResult.ok) return tasksResult;

  const labelsResult = await adapter.getAll<Label>(LABEL_PREFIX);
  if (!labelsResult.ok) return labelsResult;

  const savedViewsResult = await adapter.getAll<SavedView>(SAVED_VIEW_PREFIX);
  if (!savedViewsResult.ok) return savedViewsResult;

  const epicsResult = await adapter.getAll<Epic>(EPIC_PREFIX);
  if (!epicsResult.ok) return epicsResult;

  const settingsResult = await adapter.get<Record<string, unknown>>(SETTINGS_KEY);
  if (!settingsResult.ok) return settingsResult;

  const exportData = {
    version: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    projects: projectsResult.value.map((p) => {
      const { _version, ...project } = p;
      return project;
    }),
    tasks: tasksResult.value.map((t) => {
      const { _version, ...task } = t;
      return task;
    }),
    labels: labelsResult.value,
    savedViews: savedViewsResult.value,
    epics: epicsResult.value,
    settings: settingsResult.value ?? undefined,
  };

  const validation = validateExportData(exportData);

  return ok(validation);
};

export const importData = async (
  adapter: StorageAdapter,
  data: ImportDataValidated,
  options: { mode: 'merge' | 'replace' } = { mode: 'merge' }
): Promise<Result<ImportResult, StorageError | ValidationError>> => {
  validateImportData(data);

  const relationshipError = validateImportRelationships(data);
  if (relationshipError) return err(relationshipError);

  if (options.mode === 'replace') {
    for (const prefix of [
      PROJECT_PREFIX,
      TASK_PREFIX,
      LABEL_PREFIX,
      SAVED_VIEW_PREFIX,
      EPIC_PREFIX,
    ]) {
      const clearResult = await adapter.clear(prefix);
      if (!clearResult.ok) return clearResult;
    }
  }

  let projectsCreated = 0;
  let tasksCreated = 0;
  let labelsCreated = 0;
  let savedViewsCreated = 0;
  let epicsCreated = 0;

  for (const project of data.projects) {
    const key = createStorageKey('projects', project.id);
    const existingResult = await adapter.get(key);
    if (!existingResult.ok) return existingResult;
    if (existingResult.value && options.mode === 'merge') continue;

    const setResult = await adapter.set(key, project);
    if (!setResult.ok) return setResult;
    projectsCreated++;
  }

  for (const task of data.tasks) {
    const key = createStorageKey('tasks', task.id);
    const existingResult = await adapter.get(key);
    if (!existingResult.ok) return existingResult;
    if (existingResult.value && options.mode === 'merge') continue;

    const setResult = await adapter.set(key, task);
    if (!setResult.ok) return setResult;
    tasksCreated++;
  }

  for (const label of data.labels) {
    const key = createStorageKey('labels', label.id);
    const existingResult = await adapter.get(key);
    if (!existingResult.ok) return existingResult;
    if (existingResult.value && options.mode === 'merge') continue;

    const setResult = await adapter.set(key, label);
    if (!setResult.ok) return setResult;
    labelsCreated++;
  }

  for (const savedView of data.savedViews) {
    const key = createStorageKey('savedViews', savedView.id);
    const existingResult = await adapter.get(key);
    if (!existingResult.ok) return existingResult;
    if (existingResult.value && options.mode === 'merge') continue;

    const setResult = await adapter.set(key, savedView);
    if (!setResult.ok) return setResult;
    savedViewsCreated++;
  }

  for (const epic of data.epics) {
    const key = createStorageKey('epics', epic.id);
    const existingResult = await adapter.get(key);
    if (!existingResult.ok) return existingResult;
    if (existingResult.value && options.mode === 'merge') continue;
    const setResult = await adapter.set(key, epic);
    if (!setResult.ok) return setResult;
    epicsCreated++;
  }

  if (data.settings) {
    const settingsResult = await adapter.set(SETTINGS_KEY, data.settings);
    if (!settingsResult.ok) return settingsResult;
  }

  return ok({ projectsCreated, tasksCreated, labelsCreated, savedViewsCreated, epicsCreated });
};

export { validateImportData } from '@/domain/validation';

/**
 * Removes every project, task, label, saved view and stored preference.
 * Leaves the schema metadata intact so the app stays migrated.
 */
export const clearAllData = async (
  adapter: StorageAdapter
): Promise<Result<void, StorageError>> => {
  for (const prefix of [
    PROJECT_PREFIX,
    TASK_PREFIX,
    LABEL_PREFIX,
    SAVED_VIEW_PREFIX,
    EPIC_PREFIX,
    SETTINGS_PREFIX,
  ]) {
    const clearResult = await adapter.clear(prefix);
    if (!clearResult.ok) return clearResult;
  }

  return ok(undefined);
};

/**
 * Writes a fresh set of sample projects and tasks to storage.
 */
export const seedDemoData = async (
  adapter: StorageAdapter
): Promise<Result<void, StorageError>> => {
  const { projects, tasks } = createDemoData();

  for (const project of projects) {
    const setResult = await adapter.set(createStorageKey('projects', project.id), project);
    if (!setResult.ok) return setResult;
  }

  for (const task of tasks) {
    const setResult = await adapter.set(createStorageKey('tasks', task.id), task);
    if (!setResult.ok) return setResult;
  }

  return ok(undefined);
};

/**
 * Clears all data and then restores the sample projects and tasks.
 */
export const resetToDemoData = async (
  adapter: StorageAdapter
): Promise<Result<void, StorageError>> => {
  const clearResult = await clearAllData(adapter);
  if (!clearResult.ok) return clearResult;

  return seedDemoData(adapter);
};

/**
 * One-time application setup.
 *
 * Runs any pending schema migrations and, on a brand new install, seeds the
 * sample projects and tasks so the app isn't empty on first launch. The
 * "seeded" flag means we never re-seed once the user has cleared their data.
 */
export const initializeApp = async (
  adapter: StorageAdapter
): Promise<Result<void, StorageError>> => {
  const migrationResult = await runMigrations(adapter);
  if (!migrationResult.ok) return migrationResult;

  const seededResult = await adapter.get<boolean>(SEEDED_KEY);
  if (!seededResult.ok) return seededResult;
  if (seededResult.value) return ok(undefined);

  const projectsResult = await adapter.getAll<StoredProject>(PROJECT_PREFIX);
  if (!projectsResult.ok) return projectsResult;

  if (projectsResult.value.length === 0) {
    const seedResult = await seedDemoData(adapter);
    if (!seedResult.ok) return seedResult;
  }

  return adapter.set(SEEDED_KEY, true);
};
