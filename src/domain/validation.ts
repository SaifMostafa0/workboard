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
});

// Import/Export schemas
export const exportDataSchema = z.object({
  version: z.number().int().positive(),
  exportedAt: z.string().datetime({ offset: true }),
  projects: z.array(projectSchema),
  tasks: z.array(taskSchema),
});

export const importDataSchema = z.object({
  version: z.number().int().positive(),
  projects: z.array(projectSchema),
  tasks: z.array(taskSchema),
  settings: z.unknown().optional(),
});

// Type inference
export type ProjectInputValidated = z.infer<typeof projectInputSchema>;
export type ProjectUpdateValidated = z.infer<typeof projectUpdateSchema>;
export type ProjectValidated = z.infer<typeof projectSchema>;
export type TaskInputValidated = z.infer<typeof taskInputSchema>;
export type TaskUpdateValidated = z.infer<typeof taskUpdateSchema>;
export type TaskValidated = z.infer<typeof taskSchema>;
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

export const validateImportRelationships = (data: ImportDataValidated): ValidationError | null => {
  const projectIds = new Set(data.projects.map((p) => p.id));
  const taskProjectIds = new Set(data.tasks.map((t) => t.projectId));

  // Check for orphan tasks
  const orphanProjectIds = [...taskProjectIds].filter((id) => !projectIds.has(id));
  if (orphanProjectIds.length > 0) {
    return createValidationError([
      {
        field: 'tasks',
        message: `Tasks reference non-existent projects: ${orphanProjectIds.join(', ')}`,
        code: 'orphan_tasks',
      },
    ]);
  }

  // Check for duplicate IDs
  const projectIdCounts = new Map<string, number>();
  data.projects.forEach((p) => projectIdCounts.set(p.id, (projectIdCounts.get(p.id) || 0) + 1));
  const duplicateProjectIds = [...projectIdCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id]) => id);

  const taskIdCounts = new Map<string, number>();
  data.tasks.forEach((t) => taskIdCounts.set(t.id, (taskIdCounts.get(t.id) || 0) + 1));
  const duplicateTaskIds = [...taskIdCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id]) => id);

  if (duplicateProjectIds.length > 0 || duplicateTaskIds.length > 0) {
    return createValidationError([
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
    ]);
  }

  return null;
};
