export interface AppError {
  readonly type: string;
  readonly message: string;
  readonly cause?: Error;
}

export interface StorageError extends AppError {
  readonly type:
    | 'QUOTA_EXCEEDED'
    | 'NOT_FOUND'
    | 'CORRUPTED_DATA'
    | 'UNSUPPORTED_OPERATION'
    | 'PERMISSION_DENIED';
  readonly code?: string;
  readonly key?: string;
}

export interface ValidationError extends AppError {
  readonly type: 'VALIDATION_ERROR';
  readonly field?: string;
  readonly issues: readonly ValidationIssue[];
}

export interface ValidationIssue {
  readonly field: string;
  readonly message: string;
  readonly code: string;
}

export interface NotFoundError extends AppError {
  readonly type: 'NOT_FOUND';
  readonly resource: string;
  readonly id: string;
}

export interface ConflictError extends AppError {
  readonly type: 'CONFLICT';
  readonly resource: string;
  readonly message: string;
}

export type DomainError = StorageError | ValidationError | NotFoundError | ConflictError;

export const createStorageError = (
  type: StorageError['type'],
  message: string,
  options?: { key?: string; cause?: Error }
): StorageError => ({
  type,
  message,
  code: 'STORAGE_ERROR',
  key: options?.key,
  cause: options?.cause,
});

export const createValidationError = (
  issues: ValidationIssue[],
  message = 'Validation failed'
): ValidationError => ({
  type: 'VALIDATION_ERROR',
  message,
  issues,
});

export const createNotFoundError = (resource: string, id: string): NotFoundError => ({
  type: 'NOT_FOUND',
  message: `${resource} not found: ${id}`,
  resource,
  id,
});

export const createConflictError = (resource: string, message: string): ConflictError => ({
  type: 'CONFLICT',
  message,
  resource,
});

export const isStorageError = (error: DomainError): error is StorageError => {
  return [
    'QUOTA_EXCEEDED',
    'NOT_FOUND',
    'CORRUPTED_DATA',
    'UNSUPPORTED_OPERATION',
    'PERMISSION_DENIED',
  ].includes(error.type);
};

export const isValidationError = (error: DomainError): error is ValidationError => {
  return error.type === 'VALIDATION_ERROR';
};

export const isNotFoundError = (error: DomainError): error is NotFoundError => {
  return error.type === 'NOT_FOUND';
};
