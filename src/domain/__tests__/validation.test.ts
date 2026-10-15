import { describe, expect, it } from 'vitest';
import type { Project, Task } from '../index';
import {
  safeValidateProjectInput,
  validateImportData,
  validateImportRelationships,
  validateProject,
  validateProjectInput,
  validateProjectUpdate,
  validateTask,
  validateTaskInput,
  validateTaskProjectReference,
  validateTaskUpdate,
  zodErrorToValidationError,
} from '../validation';

describe('Validation', () => {
  describe('Project validation', () => {
    const validProjectInput = {
      name: 'Test Project',
      description: 'A test project',
      color: 'blue' as const,
    };

    it('validates valid project input', () => {
      const result = validateProjectInput(validProjectInput);
      expect(result.name).toBe('Test Project');
      expect(result.description).toBe('A test project');
      expect(result.color).toBe('blue');
    });

    it('rejects empty name', () => {
      expect(() => validateProjectInput({ ...validProjectInput, name: '' })).toThrow(
        'Project name is required'
      );
    });

    it('rejects name too long', () => {
      expect(() => validateProjectInput({ ...validProjectInput, name: 'a'.repeat(101) })).toThrow(
        'Name must be 100 characters or less'
      );
    });

    it('rejects description too long', () => {
      expect(() =>
        validateProjectInput({ ...validProjectInput, description: 'a'.repeat(501) })
      ).toThrow('Description must be 500 characters or less');
    });

    it('rejects invalid color', () => {
      expect(() => validateProjectInput({ ...validProjectInput, color: 'invalid' })).toThrow();
    });

    it('uses default color when not provided', () => {
      const { color: _color, ...input } = validProjectInput;
      const result = validateProjectInput(input);
      expect(result.color).toBe('blue');
    });

    it('uses default description when not provided', () => {
      const { description: _description, ...input } = validProjectInput;
      const result = validateProjectInput(input);
      expect(result.description).toBe('');
    });
  });

  describe('Project update validation', () => {
    it('validates partial project update', () => {
      const result = validateProjectUpdate({ name: 'Updated Name' });
      expect(result.name).toBe('Updated Name');
      expect(result.description).toBeUndefined();
      expect(result.color).toBeUndefined();
    });

    it('validates full project update', () => {
      const result = validateProjectUpdate({
        name: 'Updated',
        description: 'New desc',
        color: 'red',
      });
      expect(result.name).toBe('Updated');
      expect(result.description).toBe('New desc');
      expect(result.color).toBe('red');
    });

    it('rejects empty name in update', () => {
      expect(() => validateProjectUpdate({ name: '' })).toThrow('Project name is required');
    });
  });

  describe('Project schema validation', () => {
    const validProject: Project = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Project',
      description: 'Description',
      color: 'blue',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    it('validates valid project', () => {
      const result = validateProject(validProject);
      expect(result.id).toBe(validProject.id);
    });

    it('rejects invalid UUID', () => {
      expect(() => validateProject({ ...validProject, id: 'invalid-id' })).toThrow(
        'Invalid project ID'
      );
    });

    it('rejects invalid datetime', () => {
      expect(() => validateProject({ ...validProject, createdAt: 'not-a-date' })).toThrow();
    });
  });

  describe('Task validation', () => {
    const validTaskInput = {
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test Task',
      description: 'A test task',
      status: 'todo' as const,
      priority: 'medium' as const,
      tags: ['tag1', 'tag2'],
    };

    it('validates valid task input', () => {
      const result = validateTaskInput(validTaskInput);
      expect(result.title).toBe('Test Task');
      expect(result.status).toBe('todo');
      expect(result.priority).toBe('medium');
    });

    it('rejects empty title', () => {
      expect(() => validateTaskInput({ ...validTaskInput, title: '' })).toThrow(
        'Task title is required'
      );
    });

    it('rejects title too long', () => {
      expect(() => validateTaskInput({ ...validTaskInput, title: 'a'.repeat(201) })).toThrow(
        'Title must be 200 characters or less'
      );
    });

    it('rejects invalid projectId', () => {
      expect(() => validateTaskInput({ ...validTaskInput, projectId: 'invalid' })).toThrow(
        'Invalid project ID'
      );
    });

    it('rejects invalid status', () => {
      expect(() => validateTaskInput({ ...validTaskInput, status: 'invalid' })).toThrow();
    });

    it('rejects invalid priority', () => {
      expect(() => validateTaskInput({ ...validTaskInput, priority: 'invalid' })).toThrow();
    });

    it('rejects invalid due date format', () => {
      expect(() => validateTaskInput({ ...validTaskInput, dueDate: '01/01/2024' })).toThrow(
        'Due date must be a valid calendar date'
      );
    });

    it('accepts valid due date format', () => {
      const result = validateTaskInput({ ...validTaskInput, dueDate: '2024-12-31' });
      expect(result.dueDate).toBe('2024-12-31');
    });

    it('rejects too many tags', () => {
      expect(() =>
        validateTaskInput({
          ...validTaskInput,
          tags: Array(11).fill('tag'),
        })
      ).toThrow('Maximum 10 tags allowed');
    });

    it('rejects tag too long', () => {
      expect(() =>
        validateTaskInput({
          ...validTaskInput,
          tags: ['a'.repeat(31)],
        })
      ).toThrow('Tag must be 30 characters or less');
    });

    it('uses defaults when not provided', () => {
      const { status: _status, priority: _priority, tags: _tags, ...input } = validTaskInput;
      const result = validateTaskInput(input);
      expect(result.status).toBe('todo');
      expect(result.priority).toBe('medium');
      expect(result.tags).toEqual([]);
    });
  });

  describe('Task update validation', () => {
    it('validates partial task update', () => {
      const result = validateTaskUpdate({ title: 'Updated Title' });
      expect(result.title).toBe('Updated Title');
      expect(result.status).toBeUndefined();
    });

    it('validates status change', () => {
      const result = validateTaskUpdate({ status: 'done' });
      expect(result.status).toBe('done');
    });
  });

  describe('Task schema validation', () => {
    const validTask: Task = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      projectId: '123e4567-e89b-12d3-a456-426614174001',
      title: 'Test Task',
      description: 'Description',
      status: 'todo',
      priority: 'medium',
      tags: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    it('validates valid task', () => {
      const result = validateTask(validTask);
      expect(result.id).toBe(validTask.id);
    });

    it('rejects invalid task UUID', () => {
      expect(() => validateTask({ ...validTask, id: 'invalid' })).toThrow('Invalid task ID');
    });

    it('rejects invalid projectId UUID', () => {
      expect(() => validateTask({ ...validTask, projectId: 'invalid' })).toThrow(
        'Invalid project ID'
      );
    });
  });

  describe('Import data validation', () => {
    const validImportData = {
      version: 1,
      projects: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Project',
          description: 'Description',
          color: 'blue',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
      tasks: [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          projectId: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Task',
          description: 'Description',
          status: 'todo',
          priority: 'medium',
          tags: [],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ],
    };

    it('validates valid import data', () => {
      const result = validateImportData(validImportData);
      expect(result.version).toBe(1);
      expect(result.projects).toHaveLength(1);
      expect(result.tasks).toHaveLength(1);
    });

    it('rejects missing version', () => {
      expect(() => validateImportData({ ...validImportData, version: undefined })).toThrow();
    });

    it('rejects invalid version', () => {
      expect(() => validateImportData({ ...validImportData, version: 0 })).toThrow();
    });

    it('defaults labels and saved views to empty arrays for legacy payloads', () => {
      const result = validateImportData(validImportData);
      expect(result.labels).toEqual([]);
      expect(result.savedViews).toEqual([]);
    });

    it('parses labels and saved views when present', () => {
      const result = validateImportData({
        ...validImportData,
        labels: [
          {
            id: '123e4567-e89b-12d3-a456-426614174010',
            name: 'Bug',
            color: '#e11d48',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        savedViews: [
          {
            id: '123e4567-e89b-12d3-a456-426614174011',
            name: 'Todo work',
            filters: { status: 'todo', tags: ['bug'], order: 'asc' },
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
      });

      expect(result.labels).toHaveLength(1);
      expect(result.labels[0]?.name).toBe('Bug');
      expect(result.savedViews).toHaveLength(1);
      expect(result.savedViews[0]?.filters.tags).toEqual(['bug']);
    });

    it('rejects a saved view with an invalid order', () => {
      expect(() =>
        validateImportData({
          ...validImportData,
          savedViews: [
            {
              id: '123e4567-e89b-12d3-a456-426614174011',
              name: 'Bad view',
              filters: { order: 'sideways' },
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            },
          ],
        })
      ).toThrow();
    });
  });

  describe('Safe validation', () => {
    it('returns success for valid input', () => {
      const result = safeValidateProjectInput({ name: 'Test', description: '', color: 'blue' });
      expect(result.success).toBe(true);
    });

    it('returns error for invalid input', () => {
      const result = safeValidateProjectInput({ name: '', description: '', color: 'blue' });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('zodErrorToValidationError', () => {
    it('converts Zod error to validation error', () => {
      const zodError = {
        issues: [
          { path: ['name'], message: 'Required', code: 'too_small' },
          { path: ['color'], message: 'Invalid', code: 'invalid_enum_value' },
        ],
      } as unknown as Parameters<typeof zodErrorToValidationError>[0];

      const result = zodErrorToValidationError(zodError);
      expect(result.type).toBe('VALIDATION_ERROR');
      expect(result.issues).toHaveLength(2);
      expect(result.issues[0]?.field).toBe('name');
      expect(result.issues[1]?.field).toBe('color');
    });
  });

  describe('validateTaskProjectReference', () => {
    it('returns null for valid project reference', () => {
      const task = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test',
        description: '',
        status: 'todo' as const,
        priority: 'medium' as const,
        tags: [],
      };
      const projectIds = new Set(['123e4567-e89b-12d3-a456-426614174000']);

      const result = validateTaskProjectReference(task, projectIds);
      expect(result).toBeNull();
    });

    it('returns error for invalid project reference', () => {
      const task = {
        projectId: 'invalid-id',
        title: 'Test',
        description: '',
        status: 'todo' as const,
        priority: 'medium' as const,
        tags: [],
      };
      const projectIds = new Set(['123e4567-e89b-12d3-a456-426614174000']);

      const result = validateTaskProjectReference(task, projectIds);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('VALIDATION_ERROR');
    });
  });

  describe('validateImportRelationships', () => {
    it('returns null for valid relationships', () => {
      const data = {
        version: 1,
        projects: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Project',
            description: '',
            color: 'blue' as const,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        tasks: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            projectId: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Task',
            description: '',
            status: 'todo' as const,
            priority: 'medium' as const,
            tags: [],
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        labels: [],
        savedViews: [],
        epics: [],
      };

      const result = validateImportRelationships(data);
      expect(result).toBeNull();
    });

    it('returns error for orphan tasks', () => {
      const data = {
        version: 1,
        projects: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Project',
            description: '',
            color: 'blue' as const,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        tasks: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            projectId: 'non-existent-id',
            title: 'Task',
            description: '',
            status: 'todo' as const,
            priority: 'medium' as const,
            tags: [],
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        labels: [],
        savedViews: [],
        epics: [],
      };

      const result = validateImportRelationships(data);
      expect(result).not.toBeNull();
      expect(result?.issues[0]?.code).toBe('orphan_tasks');
    });

    it('returns error for duplicate project IDs', () => {
      const data = {
        version: 1,
        projects: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Project 1',
            description: '',
            color: 'blue' as const,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Project 2',
            description: '',
            color: 'red' as const,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        tasks: [],
        labels: [],
        savedViews: [],
        epics: [],
      };

      const result = validateImportRelationships(data);
      expect(result).not.toBeNull();
      expect(result?.issues[0]?.code).toBe('duplicate_id');
    });

    it('returns error for duplicate label IDs', () => {
      const data = {
        version: 1,
        projects: [],
        tasks: [],
        labels: [
          {
            id: '123e4567-e89b-12d3-a456-426614174020',
            name: 'Bug',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
          {
            id: '123e4567-e89b-12d3-a456-426614174020',
            name: 'Bug again',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        savedViews: [],
        epics: [],
      };

      const result = validateImportRelationships(data);
      expect(result).not.toBeNull();
      expect(result?.issues[0]?.field).toBe('labels');
    });

    it('returns error for duplicate saved view IDs', () => {
      const data = {
        version: 1,
        projects: [],
        tasks: [],
        labels: [],
        savedViews: [
          {
            id: '123e4567-e89b-12d3-a456-426614174021',
            name: 'View',
            filters: {},
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
          {
            id: '123e4567-e89b-12d3-a456-426614174021',
            name: 'View again',
            filters: {},
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        epics: [],
      };

      const result = validateImportRelationships(data);
      expect(result).not.toBeNull();
      expect(result?.issues[0]?.field).toBe('savedViews');
    });
  });
});
