/**
 * Test-only fault injection for storage *writes*.
 *
 * End-to-end tests need to simulate a write failure (full disk, blocked
 * IndexedDB, …) that happens *after* the app has loaded, so the initial reads
 * the pages depend on still succeed. That can't be done by deleting the storage
 * APIs from the browser: it would break the reads too.
 *
 * Instead the real adapters consult this flag before persisting. The control
 * hook is installed on `window` only when the page is explicitly loaded with
 * `?__e2e`, so it is impossible for a real user to trigger.
 */
let failWrites = false;

export const shouldFailWrites = (): boolean => failWrites;

export const setFailWrites = (value: boolean): void => {
  failWrites = value;
};

interface WorkboardTestHooks {
  failWrites: (value: boolean) => void;
}

declare global {
  interface Window {
    __workboardTestHooks?: WorkboardTestHooks;
  }
}

if (typeof window !== 'undefined' && window.location.search.includes('__e2e')) {
  window.__workboardTestHooks = { failWrites: setFailWrites };
}
