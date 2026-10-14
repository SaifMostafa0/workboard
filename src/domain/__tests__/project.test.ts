import { describe, expect, it } from 'vitest';
import type { Project, ProjectInput } from '../project';
import { DEFAULT_PROJECT_COLOR, isValidProjectColor, PROJECT_COLORS } from '../project';

describe('Project Domain', () => {
  describe('PROJECT_COLORS', () => {
    it('contains all expected colors', () => {
      expect(PROJECT_COLORS).toEqual([
        'blue',
        'indigo',
        'purple',
        'pink',
        'red',
        'orange',
        'amber',
        'yellow',
        'lime',
        'green',
        'emerald',
        'teal',
        'cyan',
        'sky',
      ]);
    });

    it('has 14 colors', () => {
      expect(PROJECT_COLORS).toHaveLength(14);
    });
  });

  describe('isValidProjectColor', () => {
    it('returns true for valid colors', () => {
      PROJECT_COLORS.forEach((color) => {
        expect(isValidProjectColor(color)).toBe(true);
      });
    });

    it('returns false for invalid colors', () => {
      expect(isValidProjectColor('invalid')).toBe(false);
      expect(isValidProjectColor('')).toBe(false);
      expect(isValidProjectColor('BLUE')).toBe(false); // case sensitive
    });
  });

  describe('DEFAULT_PROJECT_COLOR', () => {
    it('is a valid color', () => {
      expect(isValidProjectColor(DEFAULT_PROJECT_COLOR)).toBe(true);
    });
  });

  describe('Project type structure', () => {
    it('has all required fields', () => {
      const project: Project = {
        id: 'test-id',
        name: 'Test Project',
        description: 'Description',
        color: 'blue',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      expect(project.id).toBeDefined();
      expect(project.name).toBeDefined();
      expect(project.description).toBeDefined();
      expect(project.color).toBeDefined();
      expect(project.createdAt).toBeDefined();
      expect(project.updatedAt).toBeDefined();
    });
  });

  describe('ProjectInput type structure', () => {
    it('has required fields without id and timestamps', () => {
      const input: ProjectInput = {
        name: 'Test Project',
        description: 'Description',
        color: 'blue',
      };

      expect(input.name).toBeDefined();
      expect(input.description).toBeDefined();
      expect(input.color).toBeDefined();
      expect((input as unknown as Record<string, unknown>).id).toBeUndefined();
      expect((input as unknown as Record<string, unknown>).createdAt).toBeUndefined();
    });
  });
});
