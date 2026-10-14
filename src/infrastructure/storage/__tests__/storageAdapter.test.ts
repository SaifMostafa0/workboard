import { describe, expect, it } from 'vitest';
import {
  createCollectionPrefix,
  createStorageKey,
  err,
  flatMapResult,
  handleStorageError,
  isErr,
  isOk,
  mapResult,
  ok,
  parseStorageKey,
  unwrap,
  unwrapErr,
} from '../storageAdapter';

describe('Result helpers', () => {
  it('wraps success and failure values', () => {
    expect(ok(42)).toEqual({ ok: true, value: 42 });
    expect(err('nope')).toEqual({ ok: false, error: 'nope' });
  });

  it('discriminates with isOk / isErr', () => {
    expect(isOk(ok(1))).toBe(true);
    expect(isOk(err('e'))).toBe(false);
    expect(isErr(err('e'))).toBe(true);
    expect(isErr(ok(1))).toBe(false);
  });

  it('unwraps success values and throws on failure', () => {
    expect(unwrap(ok('value'))).toBe('value');
    expect(() => unwrap(err(new Error('boom')))).toThrow('boom');
  });

  it('unwraps failures and throws on success', () => {
    expect(unwrapErr(err('problem'))).toBe('problem');
    expect(() => unwrapErr(ok(1))).toThrow('Expected error but got ok result');
  });

  it('maps success values and passes failures through unchanged', () => {
    expect(mapResult(ok(2), (n) => n * 3)).toEqual({ ok: true, value: 6 });

    const failure = err('e');
    expect(mapResult(failure, (n: number) => n * 3)).toBe(failure);
  });

  it('flat-maps success values and passes failures through unchanged', () => {
    expect(flatMapResult(ok(2), (n) => ok(n + 1))).toEqual({ ok: true, value: 3 });

    const failure = err('e');
    expect(flatMapResult(failure, (n: number) => ok(n + 1))).toBe(failure);
  });
});

describe('storage keys', () => {
  it('builds collection keys and prefixes', () => {
    expect(createStorageKey('projects', 'abc')).toBe('workboard:projects:abc');
    expect(createCollectionPrefix('tasks')).toBe('workboard:tasks:');
  });

  it('parses a storage key into collection and id', () => {
    expect(parseStorageKey('workboard:projects:abc')).toEqual({
      collection: 'projects',
      id: 'abc',
    });
  });

  it('keeps everything after the first separator as the id', () => {
    expect(parseStorageKey('workboard:projects:a:b')).toEqual({
      collection: 'projects',
      id: 'a:b',
    });
  });

  it('returns null for unprefixed or malformed keys', () => {
    expect(parseStorageKey('other:projects:abc')).toBeNull();
    expect(parseStorageKey('workboard:projects')).toBeNull();
  });
});

describe('handleStorageError', () => {
  it('maps quota DOMExceptions', () => {
    const error = new DOMException('full', 'QuotaExceededError');
    expect(handleStorageError('set', error, 'key')).toMatchObject({
      type: 'QUOTA_EXCEEDED',
      key: 'key',
    });
  });

  it('maps security DOMExceptions', () => {
    const error = new DOMException('denied', 'SecurityError');
    expect(handleStorageError('set', error).type).toBe('PERMISSION_DENIED');
  });

  it('maps generic errors that mention quota', () => {
    expect(handleStorageError('set', new Error('Quota exceeded')).type).toBe('QUOTA_EXCEEDED');
  });

  it('falls back to a corrupted-data error', () => {
    expect(handleStorageError('get', new Error('unexpected')).type).toBe('CORRUPTED_DATA');
  });
});
