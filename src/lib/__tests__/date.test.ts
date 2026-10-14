import { describe, expect, it, vi } from 'vitest';
import {
  daysUntilDue,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  isDueSoon,
  isDueToday,
  isOverdue,
  nowISO,
  parseDate,
  sortByDate,
  sortByDueDate,
} from '../date';

describe('Date Utilities', () => {
  const fixedDate = new Date('2024-06-15T12:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('nowISO', () => {
    it('returns current time in ISO format', () => {
      const result = nowISO();
      expect(result).toBe('2024-06-15T12:00:00.000Z');
    });
  });

  describe('parseDate', () => {
    it('parses valid ISO date string', () => {
      const result = parseDate('2024-06-15T12:00:00.000Z');
      expect(result).toEqual(new Date('2024-06-15T12:00:00.000Z'));
    });

    it('parses valid ISO date without time (as UTC)', () => {
      // date-fns parseISO parses date-only strings as UTC midnight in some versions,
      // but in others as local midnight. We accept either behavior.
      const result = parseDate('2024-06-15');
      expect(result).not.toBeNull();
      expect(result!.toISOString()).toMatch(/^2024-06-1[45]T/);
    });

    it('returns null for invalid date', () => {
      const result = parseDate('not-a-date');
      expect(result).toBeNull();
    });

    it('returns null for empty string', () => {
      const result = parseDate('');
      expect(result).toBeNull();
    });
  });

  describe('formatDate', () => {
    it('formats date correctly', () => {
      const result = formatDate('2024-06-15T12:00:00.000Z');
      expect(result).toBe('Jun 15, 2024');
    });

    it('handles invalid date', () => {
      const result = formatDate('invalid');
      expect(result).toBe('Invalid date');
    });
  });

  describe('formatDateTime', () => {
    it('formats date and time correctly (in local timezone)', () => {
      const result = formatDateTime('2024-06-15T12:00:00.000Z');
      // Format will depend on local timezone, just verify it formats
      expect(result).toMatch(/Jun 15, 2024/);
      expect(result).toMatch(/\d{1,2}:\d{2} [AP]M/);
    });

    it('handles invalid date', () => {
      const result = formatDateTime('invalid');
      expect(result).toBe('Invalid date');
    });
  });

  describe('formatRelativeTime', () => {
    it('returns "Just now" for very recent', () => {
      const result = formatRelativeTime('2024-06-15T11:59:30.000Z');
      expect(result).toBe('Just now');
    });

    it('returns minutes for recent', () => {
      const result = formatRelativeTime('2024-06-15T11:30:00.000Z');
      expect(result).toBe('30m ago');
    });

    it('returns hours for older', () => {
      const result = formatRelativeTime('2024-06-15T08:00:00.000Z');
      expect(result).toBe('4h ago');
    });

    it('returns days for very old', () => {
      const result = formatRelativeTime('2024-06-10T12:00:00.000Z');
      expect(result).toBe('5d ago');
    });

    it('returns formatted date for very old', () => {
      const result = formatRelativeTime('2024-06-01T12:00:00.000Z');
      expect(result).toBe('Jun 1, 2024');
    });

    it('handles invalid date', () => {
      const result = formatRelativeTime('invalid');
      expect(result).toBe('Invalid date');
    });
  });

  describe('isOverdue', () => {
    it('returns true for past due date', () => {
      const result = isOverdue('2024-06-14', fixedDate);
      expect(result).toBe(true);
    });

    it('returns false for today', () => {
      const result = isOverdue('2024-06-15', fixedDate);
      expect(result).toBe(false);
    });

    it('returns false for future date', () => {
      const result = isOverdue('2024-06-16', fixedDate);
      expect(result).toBe(false);
    });

    it('returns false for completed task (no due date)', () => {
      const result = isOverdue(undefined, fixedDate);
      expect(result).toBe(false);
    });

    it('returns false for invalid date', () => {
      const result = isOverdue('invalid', fixedDate);
      expect(result).toBe(false);
    });
  });

  describe('isDueToday', () => {
    it('returns true for today', () => {
      const result = isDueToday('2024-06-15', fixedDate);
      expect(result).toBe(true);
    });

    it('returns false for past date', () => {
      const result = isDueToday('2024-06-14', fixedDate);
      expect(result).toBe(false);
    });

    it('returns false for future date', () => {
      const result = isDueToday('2024-06-16', fixedDate);
      expect(result).toBe(false);
    });
  });

  describe('isDueSoon', () => {
    it('returns true for date within range', () => {
      const result = isDueSoon('2024-06-17', 3, fixedDate);
      expect(result).toBe(true);
    });

    it('returns false for past date', () => {
      const result = isDueSoon('2024-06-14', 3, fixedDate);
      expect(result).toBe(false);
    });

    it('returns false for date beyond range', () => {
      const result = isDueSoon('2024-06-20', 3, fixedDate);
      expect(result).toBe(false);
    });

    it('returns false for today', () => {
      const result = isDueSoon('2024-06-15', 3, fixedDate);
      expect(result).toBe(false);
    });
  });

  describe('daysUntilDue', () => {
    it('returns positive days for future', () => {
      const result = daysUntilDue('2024-06-17', fixedDate);
      expect(result).toBe(2);
    });

    it('returns 0 for today', () => {
      const result = daysUntilDue('2024-06-15', fixedDate);
      expect(result).toBe(0);
    });

    it('returns negative days for past', () => {
      const result = daysUntilDue('2024-06-13', fixedDate);
      expect(result).toBe(-2);
    });

    it('returns Infinity for no due date', () => {
      const result = daysUntilDue(undefined, fixedDate);
      expect(result).toBe(Infinity);
    });
  });

  describe('sortByDate', () => {
    const items = [
      { createdAt: '2024-06-10T00:00:00.000Z', name: 'A' },
      { createdAt: '2024-06-15T00:00:00.000Z', name: 'B' },
      { createdAt: '2024-06-05T00:00:00.000Z', name: 'C' },
    ];

    it('sorts descending by default', () => {
      const result = sortByDate(items);
      expect(result.map((i) => i.name)).toEqual(['B', 'A', 'C']);
    });

    it('sorts ascending when specified', () => {
      const result = sortByDate(items, 'asc');
      expect(result.map((i) => i.name)).toEqual(['C', 'A', 'B']);
    });

    it('handles invalid dates', () => {
      const itemsWithInvalid = [
        { createdAt: 'invalid', name: 'A' },
        { createdAt: '2024-06-15T00:00:00.000Z', name: 'B' },
      ];
      const result = sortByDate(itemsWithInvalid);
      expect(result[0]?.name).toBe('B');
    });
  });

  describe('sortByDueDate', () => {
    const items = [
      { dueDate: '2024-06-20', name: 'A' },
      { dueDate: '2024-06-10', name: 'B' },
      { dueDate: undefined, name: 'C' },
      { dueDate: '2024-06-15', name: 'D' },
    ];

    it('sorts ascending by default (earliest first)', () => {
      const result = sortByDueDate(items);
      expect(result.map((i) => i.name)).toEqual(['B', 'D', 'A', 'C']);
    });

    it('sorts descending when specified', () => {
      const result = sortByDueDate(items, 'desc');
      expect(result.map((i) => i.name)).toEqual(['A', 'D', 'B', 'C']);
    });

    it('puts items without due date at end', () => {
      const result = sortByDueDate(items);
      expect(result[result.length - 1]?.name).toBe('C');
    });
  });
});
