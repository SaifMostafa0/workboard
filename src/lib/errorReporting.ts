export interface ErrorContext {
  componentStack?: string;
  [key: string]: unknown;
}

export type ErrorReporter = (error: Error, context?: ErrorContext) => void;

/**
 * Single funnel for reporting errors to a monitoring service.
 *
 * Nothing is configured out of the box. To wire Sentry (or any other provider),
 * call `setErrorReporter` once at startup — for example in `src/main.tsx`:
 *
 *   import * as Sentry from '@sentry/react';
 *   setErrorReporter((error, context) =>
 *     Sentry.captureException(error, { extra: context })
 *   );
 *
 * When no reporter is registered we fall back to `console.error`, so errors are
 * never silently swallowed in development or tests.
 */
let reporter: ErrorReporter | null = null;

export const setErrorReporter = (next: ErrorReporter | null): void => {
  reporter = next;
};

export const reportError: ErrorReporter = (error, context) => {
  if (reporter) {
    reporter(error, context);
    return;
  }
  console.error('Unhandled error:', error, context);
};
