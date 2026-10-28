import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RECURRENCE,
  nextRecurrenceDate,
  recurrenceLabel,
  validateRecurrence,
} from '../recurrence';

describe('recurrence', () => {
  describe('nextRecurrenceDate', () => {
    it('advances daily recurrences by the interval', () => {
      expect(nextRecurrenceDate('2026-01-01', { frequency: 'daily', interval: 1 })).toBe(
        '2026-01-02'
      );
      expect(nextRecurrenceDate('2026-01-01', { frequency: 'daily', interval: 3 })).toBe(
        '2026-01-04'
      );
    });

    it('advances weekly recurrences in whole weeks', () => {
      expect(nextRecurrenceDate('2026-01-01', { frequency: 'weekly', interval: 2 })).toBe(
        '2026-01-15'
      );
    });

    it('crosses month and year boundaries', () => {
      expect(nextRecurrenceDate('2026-01-31', { frequency: 'daily', interval: 1 })).toBe(
        '2026-02-01'
      );
      expect(nextRecurrenceDate('2026-12-31', { frequency: 'daily', interval: 1 })).toBe(
        '2027-01-01'
      );
    });

    it('clamps monthly recurrences to the end of shorter months', () => {
      expect(nextRecurrenceDate('2026-01-31', { frequency: 'monthly', interval: 1 })).toBe(
        '2026-02-28'
      );
      expect(nextRecurrenceDate('2024-01-31', { frequency: 'monthly', interval: 1 })).toBe(
        '2024-02-29'
      );
    });

    it('rolls monthly recurrences into the following year', () => {
      expect(nextRecurrenceDate('2026-12-15', { frequency: 'monthly', interval: 1 })).toBe(
        '2027-01-15'
      );
      expect(nextRecurrenceDate('2026-11-30', { frequency: 'monthly', interval: 3 })).toBe(
        '2027-02-28'
      );
    });

    it('is timezone independent across DST transitions', () => {
      // UTC arithmetic must not shift the calendar date when local clocks change.
      expect(nextRecurrenceDate('2026-03-28', { frequency: 'daily', interval: 1 })).toBe(
        '2026-03-29'
      );
      expect(nextRecurrenceDate('2026-10-24', { frequency: 'weekly', interval: 1 })).toBe(
        '2026-10-31'
      );
    });

    it('treats the until date as inclusive', () => {
      expect(
        nextRecurrenceDate('2026-01-01', {
          frequency: 'daily',
          interval: 1,
          until: '2026-01-02',
        })
      ).toBe('2026-01-02');
      expect(
        nextRecurrenceDate('2026-01-01', {
          frequency: 'daily',
          interval: 2,
          until: '2026-01-02',
        })
      ).toBeUndefined();
    });

    it('returns undefined for malformed due dates', () => {
      expect(nextRecurrenceDate('2026-02-31', DEFAULT_RECURRENCE)).toBeUndefined();
      expect(nextRecurrenceDate('not-a-date', DEFAULT_RECURRENCE)).toBeUndefined();
      expect(nextRecurrenceDate('2026-1-1', DEFAULT_RECURRENCE)).toBeUndefined();
    });

    it('returns undefined for out-of-range intervals', () => {
      expect(nextRecurrenceDate('2026-01-01', { frequency: 'daily', interval: 0 })).toBeUndefined();
      expect(
        nextRecurrenceDate('2026-01-01', { frequency: 'daily', interval: 1.5 })
      ).toBeUndefined();
      expect(
        nextRecurrenceDate('2026-01-01', { frequency: 'daily', interval: 100 })
      ).toBeUndefined();
    });
  });

  describe('validateRecurrence', () => {
    it('accepts missing recurrence rules', () => {
      expect(validateRecurrence(undefined, undefined)).toBeNull();
    });

    it('requires a due date to anchor the schedule', () => {
      expect(validateRecurrence(DEFAULT_RECURRENCE, undefined)).toBe('recurrence_due_date');
    });

    it('rejects invalid intervals', () => {
      expect(validateRecurrence({ frequency: 'daily', interval: 0 }, '2026-01-01')).toBe(
        'recurrence_interval'
      );
    });

    it('rejects an end date before the due date', () => {
      expect(
        validateRecurrence({ frequency: 'daily', interval: 1, until: '2025-12-31' }, '2026-01-01')
      ).toBe('recurrence_until');
    });

    it('accepts a valid rule', () => {
      expect(
        validateRecurrence({ frequency: 'weekly', interval: 2, until: '2026-06-01' }, '2026-01-01')
      ).toBeNull();
    });
  });

  describe('recurrenceLabel', () => {
    it('uses singular and plural units', () => {
      expect(recurrenceLabel({ frequency: 'daily', interval: 1 })).toBe('Every daily');
      expect(recurrenceLabel({ frequency: 'weekly', interval: 2 })).toBe('Every 2 weekly');
      expect(recurrenceLabel({ frequency: 'monthly', interval: 1 })).toBe('Every monthly');
    });

    it('appends the end date when set', () => {
      expect(recurrenceLabel({ frequency: 'daily', interval: 1, until: '2026-02-01' })).toBe(
        'Every daily until 2026-02-01'
      );
    });
  });
});
