import { describe, expect, it } from 'vitest';
import { generateId, isValidUUID, shortId } from '../id';

describe('ID Utilities', () => {
  describe('generateId', () => {
    it('generates a valid UUID', () => {
      const id = generateId();
      expect(isValidUUID(id)).toBe(true);
    });

    it('generates unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });

    it('returns string with correct format', () => {
      const id = generateId();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('isValidUUID', () => {
    it('returns true for valid UUID v4', () => {
      // Valid UUID v4: version 4 (4xxx), variant 10xx (8, 9, a, b)
      expect(isValidUUID('123e4567-e89b-42d3-a456-426614174000')).toBe(true);
      expect(isValidUUID('123E4567-E89B-42D3-A456-426614174000')).toBe(true);
    });

    it('returns false for invalid UUID', () => {
      expect(isValidUUID('invalid')).toBe(false);
      expect(isValidUUID('123e4567-e89b-12d3-a456-42661417400')).toBe(false); // too short
      expect(isValidUUID('123e4567-e89b-12d3-a456-4266141740000')).toBe(false); // too long
      expect(isValidUUID('gggggggg-gggg-gggg-gggg-gggggggggggg')).toBe(false); // invalid chars
      expect(isValidUUID('')).toBe(false);
    });

    it('returns false for wrong version', () => {
      // Version 1 UUID (time-based)
      expect(isValidUUID('123e4567-e89b-11d3-a456-426614174000')).toBe(false);
      // Version 2 UUID (DCE security)
      expect(isValidUUID('123e4567-e89b-22d3-a456-426614174000')).toBe(false);
      // Version 3 UUID (MD5 hash)
      expect(isValidUUID('123e4567-e89b-33d3-a456-426614174000')).toBe(false);
      // Version 5 UUID (SHA-1 hash)
      expect(isValidUUID('123e4567-e89b-55d3-a456-426614174000')).toBe(false);
    });

    it('returns false for wrong variant', () => {
      // Variant 0 (NCS)
      expect(isValidUUID('123e4567-e89b-44d3-0456-426614174000')).toBe(false);
      // Variant 2 (Microsoft)
      expect(isValidUUID('123e4567-e89b-44d3-c456-426614174000')).toBe(false);
      // Variant 6 (reserved)
      expect(isValidUUID('123e4567-e89b-44d3-e456-426614174000')).toBe(false);
    });
  });

  describe('shortId', () => {
    it('returns first 8 characters by default', () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      expect(shortId(id)).toBe('123e4567');
    });

    it('returns specified length', () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      expect(shortId(id, 4)).toBe('123e');
      expect(shortId(id, 12)).toBe('123e4567-e89');
    });

    it('handles short strings', () => {
      expect(shortId('abc', 8)).toBe('abc');
    });
  });
});
