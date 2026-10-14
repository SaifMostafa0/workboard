import { afterEach, describe, expect, it, vi } from 'vitest';
import { reportError, setErrorReporter } from '../errorReporting';

describe('errorReporting', () => {
  afterEach(() => {
    setErrorReporter(null);
    vi.restoreAllMocks();
  });

  it('falls back to console.error when no reporter is registered', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('boom');

    reportError(error, { componentStack: 'stack' });

    expect(spy).toHaveBeenCalledWith('Unhandled error:', error, { componentStack: 'stack' });
  });

  it('forwards to the registered reporter', () => {
    const reporter = vi.fn();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setErrorReporter(reporter);
    const error = new Error('boom');

    reportError(error, { componentStack: 'stack' });

    expect(reporter).toHaveBeenCalledWith(error, { componentStack: 'stack' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('clears the reporter when set to null', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    setErrorReporter(() => {});
    setErrorReporter(null);

    reportError(new Error('boom'));

    expect(spy).toHaveBeenCalled();
  });
});
