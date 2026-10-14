import { describe, expect, it } from 'vitest';
import {
  createConflictError,
  createNotFoundError,
  createStorageError,
  createValidationError,
  isNotFoundError,
  isStorageError,
  isValidationError,
} from '../errors';

describe('error factories', () => {
  it('creates storage errors with a code and key', () => {
    const error = createStorageError('QUOTA_EXCEEDED', 'Storage full', { key: 'k' });
    expect(error).toMatchObject({ type: 'QUOTA_EXCEEDED', code: 'STORAGE_ERROR', key: 'k' });
  });

  it('creates validation errors with issues', () => {
    const error = createValidationError([
      { field: 'name', message: 'Required', code: 'too_small' },
    ]);
    expect(error.type).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Validation failed');
    expect(error.issues).toHaveLength(1);
  });

  it('creates not-found and conflict errors', () => {
    expect(createNotFoundError('Task', 't1')).toMatchObject({
      type: 'NOT_FOUND',
      resource: 'Task',
      id: 't1',
    });
    expect(createConflictError('Task', 'duplicate')).toMatchObject({
      type: 'CONFLICT',
      resource: 'Task',
    });
  });
});

describe('error type guards', () => {
  it('identifies storage errors', () => {
    expect(isStorageError(createStorageError('NOT_FOUND', 'missing'))).toBe(true);
    expect(isStorageError(createValidationError([]))).toBe(false);
  });

  it('identifies validation errors', () => {
    expect(isValidationError(createValidationError([]))).toBe(true);
    expect(isValidationError(createConflictError('Task', 'duplicate'))).toBe(false);
  });

  it('identifies not-found errors', () => {
    expect(isNotFoundError(createNotFoundError('Task', 't1'))).toBe(true);
    expect(isNotFoundError(createConflictError('Task', 'duplicate'))).toBe(false);
  });
});
