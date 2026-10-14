import { z } from 'zod';
import type { ValidationError, ValidationIssue } from './errors';
import { createValidationError } from './errors';
import type { ProjectColor } from './project';
import { PROJECT_COLORS } from './project';
import type { TaskPriority, TaskStatus } from './task';
import { TASK_PRIORITIES, TASK_STATUSES } from './task';

// Re-export ValidationError and ValidationIssue for external use
export type { ValidationError, ValidationIssue };

// Project schemas
export const projectColorSchema = z.enum(PROJECT_COLORS as [ProjectColor, ...ProjectColor[]]);

export const projectInputSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').default(''),
  color: projectColorSchema.default('blue'),
});

export const projectUpdateSchema = projectInputSchema.partial();

export const projectSchema = z.object({
  id: z.string().uuid('Invalid project ID'),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  color: projectColorSchema,
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  deletedAt: z.string().datetime({ offset: true }).optional(),
});

// Task schemas
export const taskStatusSchema = z.enum(TASK_STATUSES as [TaskStatus, ...TaskStatus[]]);
export const taskPrioritySchema = z.enum(TASK_PRIORITIES as [TaskPriority, ...TaskPriority[]]);

export const taskInputSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
  title: z
    .string()
    .min(1, 'Task title is required')
    .max(200, 'Title must be 200 characters or less'),
  description: z.string().max(2000, 'Description must be 2000 characters or less').default(''),
  status: taskStatusSchema.default('todo'),
  priority: taskPrioritySchema.default('medium'),
  dueDate: z.string().date('Due date must be a valid calendar date (YYYY-MM-DD)').optional(),
  assignee: z.string().max(100, 'Assignee name must be 100 characters or less').optional(),
  tags: z
    .array(z.string().max(30, 'Tag must be 30 characters or less'))
    .max(10, 'Maximum 10 tags allowed')
    .default([]),
  parentId: z.string().uuid('Invalid parent task ID').optional(),
  epicId: z.string().uuid('Invalid epic ID').optional(),
});

export const taskUpdateSchema = taskInputSchema.partial();

export const taskSchema = z.object({
  id: z.string().uuid('Invalid task ID'),
  projectId: z.string().uuid('Invalid project ID'),
  title: z.string().min(1).max(200),
  description: z.string().max(2000),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  dueDate: z.string().date().optional(),
  assignee: z.string().max(100).optional(),
  tags: z.array(z.string().max(30)).max(10),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  completedAt: z.string().datetime({ offset: true }).optional(),
  deletedAt: z.string().datetime({ offset: true }).optional(),
  parentId: z.string().uuid().optional(),
  epicId: z.string().uuid().optional(),
});

// Label schemas
export const epicSchema = z.object({
  id: z.string().uuid('Invalid epic ID'),
  name: z.string().min(1, 'Epic name is required').max(100),
  description: z.string().max(500).optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  deletedAt: z.string().datetime({ offset: true }).optional(),
});

export const epicInputSchema = z.object({
  name: z.string().min(1, 'Epic name is required').max(100),
  description: z.string().max(500, 'Description must be 500 characters or less').default(''),
});

export const epicUpdateSchema = epicInputSchema.partial();

export const labelSchema = z.object({
  id: z.string().uuid('Invalid label ID'),
  name: z.string().min(1, 'Label name is required'),
  color: z.string().optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

// Saved view schemas
export const savedViewFiltersSchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  project: z.string().optional(),
  due: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  tags: z.array(z.string()).optional(),
});

export const savedViewSchema = z.object({
  id: z.string().uuid('Invalid saved view ID'),
  name: z.string().min(1, 'Saved view name is required').max(100),
  filters: savedViewFiltersSchema,
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

// Import/Export schemas
// `labels` and `savedViews` default to `[]` so backups created before those
// collections were exported still import successfully.
export const exportDataSchema = z.object({
  version: z.number().int().positive(),
  exportedAt: z.string().datetime({ offset: true }),
  projects: z.array(projectSchema),
  tasks: z.array(taskSchema),
  labels: z.array(labelSchema).default([]),
  savedViews: z.array(savedViewSchema).default([]),
  epics: z.array(epicSchema).default([]),
  settings: z.unknown().optional(),
});

export const importDataSchema = z.object({
  version: z.number().int().positive(),
  projects: z.array(projectSchema),
  tasks: z.array(taskSchema),
  labels: z.array(labelSchema).default([]),
  savedViews: z.array(savedViewSchema).default([]),
  epics: z.array(epicSchema).default([]),
  settings: z.unknown().optional(),
});

// Type inference
export type ProjectInputValidated = z.infer<typeof projectInputSchema>;
export type ProjectUpdateValidated = z.infer<typeof projectUpdateSchema>;
export type ProjectValidated = z.infer<typeof projectSchema>;
export type TaskInputValidated = z.infer<typeof taskInputSchema>;
export type TaskUpdateValidated = z.infer<typeof taskUpdateSchema>;
export type TaskValidated = z.infer<typeof taskSchema>;
export type LabelValidated = z.infer<typeof labelSchema>;
export type SavedViewValidated = z.infer<typeof savedViewSchema>;
export type EpicInputValidated = z.infer<typeof epicInputSchema>;
export type EpicUpdateValidated = z.infer<typeof epicUpdateSchema>;
export type EpicValidated = z.infer<typeof epicSchema>;
export type ExportDataValidated = z.infer<typeof exportDataSchema>;
export type ImportDataValidated = z.infer<typeof importDataSchema>;

// Validation helpers
export const validateProjectInput = (data: unknown): ProjectInputValidated => {
  return projectInputSchema.parse(data);
};

export const validateProjectUpdate = (data: unknown): ProjectUpdateValidated => {
  return projectUpdateSchema.parse(data);
};

export const validateProject = (data: unknown): ProjectValidated => {
  return projectSchema.parse(data);
};

export const validateTaskInput = (data: unknown): TaskInputValidated => {
  return taskInputSchema.parse(data);
};

export const validateTaskUpdate = (data: unknown): TaskUpdateValidated => {
  return taskUpdateSchema.parse(data);
};

export const validateTask = (data: unknown): TaskValidated => {
  return taskSchema.parse(data);
};

export const validateExportData = (data: unknown): ExportDataValidated => {
  return exportDataSchema.parse(data);
};

export const validateImportData = (
  data: unknown,
  _maxSizeBytes = 1024 * 1024
): ImportDataValidated => {
  // Size check is done before parsing
  return importDataSchema.parse(data);
};

export const safeValidateProjectInput = (data: unknown) => {
  return projectInputSchema.safeParse(data);
};

export const safeValidateProjectUpdate = (data: unknown) => {
  return projectUpdateSchema.safeParse(data);
};

export const safeValidateTaskInput = (data: unknown) => {
  return taskInputSchema.safeParse(data);
};

export const safeValidateTaskUpdate = (data: unknown) => {
  return taskUpdateSchema.safeParse(data);
};

export const validateEpicInput = (data: unknown): EpicInputValidated => {
  return epicInputSchema.parse(data);
};

export const validateEpicUpdate = (data: unknown): EpicUpdateValidated => {
  return epicUpdateSchema.parse(data);
};

export const validateEpic = (data: unknown): EpicValidated => {
  return epicSchema.parse(data);
};

export const safeValidateEpicInput = (data: unknown) => {
  return epicInputSchema.safeParse(data);
};

export const safeValidateEpicUpdate = (data: unknown) => {
  return epicUpdateSchema.safeParse(data);
};

export const safeValidateImportData = (data: unknown) => {
  return importDataSchema.safeParse(data);
};

// Convert Zod errors to ValidationError
export const zodErrorToValidationError = (error: z.ZodError): ValidationError => {
  const issues: ValidationIssue[] = error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));
  return createValidationError(issues);
};

// Relationship validation
export const validateTaskProjectReference = (task: TaskInputValidated, projectIds: Set<string>) => {
  if (!projectIds.has(task.projectId)) {
    return createValidationError([
      {
        field: 'projectId',
        message: 'Referenced project does not exist',
        code: 'invalid_project_reference',
      },
    ]);
  }
  return null;
};

export const validateTaskEpicReference = (
  task: TaskInputValidated,
  epicIds: Set<string>
) => {
  if (task.epicId && !epicIds.has(task.epicId)) {
    return createValidationError([
      {
        field: 'epicId',
        message: 'Referenced epic does not exist',
        code: 'invalid_epic_reference',
      },
    ]);
  }
  return null;
};

export const validateImportRelationships = (data: ImportDataValidated): ValidationError | null => {
  const projectIds = new Set(data.projects.map((p) => p.id));
  const taskProjectIds = new Set(data.tasks.map((t) => t.projectId));
  const epicIds = new Set(data.epics.map((e) => e.id));

  // Check for orphan tasks (missing project)
  const orphanProjectIds = [...taskProjectIds].filter((id) => !projectIds.has(id));
  if (orphanProjectIds.length > 0) {
    return createValidationError(
      [
        {
          field: 'tasks',
          message: `Tasks reference non-existent projects: ${orphanProjectIds.join(', ')}`,
          code: 'orphan_tasks',
        },
      ],
      'Tasks reference projects that are not part of this import'
    );
  }

  // Check for orphan tasks (missing epic)
  const taskEpicIds = new Set(data.tasks.map((t) => t.epicId).filter(Boolean));
  const orphanEpicIds = [...taskEpicIds].filter((id) => !epicIds.has(id));
  if (orphanEpicIds.length > 0) {
    return createValidationError(
      [
        {
          field: 'tasks',
          message: `Tasks reference non-existent epics: ${orphanEpicIds.join(', ')}`,
          code: 'orphan_tasks',
        },
      ],
      'Tasks reference epics that are not part of this import'
    );
  }

  // Duplicate IDs within each collection.
  const findDuplicates = (ids: string[]): string[] => {
    const counts = new Map<string, number>();
    ids.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
    return [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
  };

  const duplicateProjectIds = findDuplicates(data.projects.map((p) => p.id));
  const duplicateTaskIds = findDuplicates(data.tasks.map((t) => t.id));
  const duplicateLabelIds = findDuplicates(data.labels.map((l) => l.id));
  const duplicateSavedViewIds = findDuplicates(data.savedViews.map((v) => v.id));
  const duplicateEpicIds = findDuplicates(data.epics.map((e) => e.id as string));

  const duplicateIssues: ValidationIssue[] = [
    ...duplicateProjectIds.map((id) => ({
      field: 'projects',
      message: `Duplicate project ID: ${id}`,
      code: 'duplicate_id',
    })),
    ...duplicateTaskIds.map((id) => ({
      field: 'tasks',
      message: `Duplicate task ID: ${id}`,
      code: 'duplicate_id',
    })),
    ...duplicateLabelIds.map((id) => ({
      field: 'labels',
      message: `Duplicate label ID: ${id}`,
      code: 'duplicate_id',
    })),
    ...duplicateSavedViewIds.map((id) => ({
      field: 'savedViews',
      message: `Duplicate saved view ID: ${id}`,
      code: 'duplicate_id',
    })),
    ...duplicateEpicIds.map((id) => ({
      field: 'epics',
      message: `Duplicate epic ID: ${id}`,
      code: 'duplicate_id',
    })),
  ];

  if (duplicateIssues.length > 0) {
    return createValidationError(duplicateIssues, 'The import contains duplicate IDs');
  }

  return null;
};
