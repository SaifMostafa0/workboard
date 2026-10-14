import { describe, expect, it } from 'vitest';
import {
  capitalize,
  formatNumber,
  joinWithConjunction,
  pluralize,
  slugify,
  titleCase,
  truncate,
} from '../format';

describe('Format Utilities', () => {
  describe('truncate', () => {
    it('returns original string if shorter than maxLength', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('truncates and adds ellipsis', () => {
      expect(truncate('Hello World', 8)).toBe('Hello…');
    });

    it('truncates at word boundary', () => {
      expect(truncate('Hello World', 11)).toBe('Hello World');
      expect(truncate('Hello World', 10)).toBe('Hello…');
    });

    it('handles exact length', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });

    it('handles empty string', () => {
      expect(truncate('', 10)).toBe('');
    });
  });

  describe('capitalize', () => {
    it('capitalizes first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
    });

    it('lowercases rest', () => {
      expect(capitalize('HELLO')).toBe('Hello');
    });

    it('handles empty string', () => {
      expect(capitalize('')).toBe('');
    });

    it('handles single character', () => {
      expect(capitalize('a')).toBe('A');
    });
  });

  describe('titleCase', () => {
    it('capitalizes each word', () => {
      expect(titleCase('hello world')).toBe('Hello World');
    });

    it('handles hyphens', () => {
      expect(titleCase('hello-world')).toBe('Hello World');
    });

    it('handles underscores', () => {
      expect(titleCase('hello_world')).toBe('Hello World');
    });

    it('handles mixed separators', () => {
      expect(titleCase('hello-world_test')).toBe('Hello World Test');
    });
  });

  describe('slugify', () => {
    it('converts to lowercase', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('replaces spaces with hyphens', () => {
      expect(slugify('Hello World Test')).toBe('hello-world-test');
    });

    it('removes special characters', () => {
      expect(slugify('Hello @ World!')).toBe('hello-world');
    });

    it('handles multiple spaces', () => {
      expect(slugify('Hello   World')).toBe('hello-world');
    });

    it('trims leading/trailing hyphens', () => {
      expect(slugify('  Hello World  ')).toBe('hello-world');
    });
  });

  describe('pluralize', () => {
    it('returns singular for 1', () => {
      expect(pluralize(1, 'task')).toBe('1 task');
    });

    it('returns plural for 0', () => {
      expect(pluralize(0, 'task')).toBe('0 tasks');
    });

    it('returns plural for >1', () => {
      expect(pluralize(5, 'task')).toBe('5 tasks');
    });

    it('uses custom plural', () => {
      expect(pluralize(1, 'person', 'people')).toBe('1 person');
      expect(pluralize(2, 'person', 'people')).toBe('2 people');
    });
  });

  describe('formatNumber', () => {
    it('formats numbers under 1000', () => {
      expect(formatNumber(500)).toBe('500');
      expect(formatNumber(999)).toBe('999');
    });

    it('formats thousands with K', () => {
      expect(formatNumber(1000)).toBe('1.0K');
      expect(formatNumber(1500)).toBe('1.5K');
      expect(formatNumber(999999)).toBe('1000.0K');
    });

    it('formats millions with M', () => {
      expect(formatNumber(1000000)).toBe('1.0M');
      expect(formatNumber(1500000)).toBe('1.5M');
    });
  });

  describe('joinWithConjunction', () => {
    it('returns empty for empty array', () => {
      expect(joinWithConjunction([])).toBe('');
    });

    it('returns single item for one element', () => {
      expect(joinWithConjunction(['a'])).toBe('a');
    });

    it('joins two with "and"', () => {
      expect(joinWithConjunction(['a', 'b'])).toBe('a and b');
    });

    it('joins multiple with commas and "and"', () => {
      expect(joinWithConjunction(['a', 'b', 'c'])).toBe('a, b, and c');
      expect(joinWithConjunction(['a', 'b', 'c', 'd'])).toBe('a, b, c, and d');
    });

    it('uses custom conjunction', () => {
      expect(joinWithConjunction(['a', 'b', 'c'], 'or')).toBe('a, b, or c');
    });
  });
});
