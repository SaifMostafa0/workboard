/**
 * Service worker registration and update flow.
 *
 * Registration is skipped in development so HMR is never served stale assets.
 * When a new worker is installed we surface a banner instead of swapping it
 * silently: swapping mid-session can drop unsaved form state, so the reload is
 * always user-initiated.
 */
const SERVICE_WORKER_URL = '/sw.js';
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

type UpdateListener = (ready: boolean) => void;

let registration: ServiceWorkerRegistration | null = null;
let updateReady = false;
let reloadOnControllerChange = false;
const listeners = new Set<UpdateListener>();

const notify = (ready: boolean): void => {
  updateReady = ready;
  for (const listener of listeners) listener(ready);
};

/** Subscribe to update availability. Fires immediately with the current value. */
export const subscribeToServiceWorkerUpdate = (listener: UpdateListener): (() => void) => {
  listeners.add(listener);
  listener(updateReady);
  return () => {
    listeners.delete(listener);
  };
};

/** Activate the waiting worker; the page reloads via `controllerchange`. */
export const applyServiceWorkerUpdate = (): void => {
  if (!registration?.waiting) {
    window.location.reload();
    return;
  }
  reloadOnControllerChange = true;
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
};

export const registerServiceWorker = (): (() => void) => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return () => {};
  // Dev serves unhashed modules; a precache would fight HMR and hide changes.
  if (import.meta.env.DEV) return () => {};

  const handleControllerChange = () => {
    if (reloadOnControllerChange) {
      reloadOnControllerChange = false;
      window.location.reload();
    }
  };
  navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

  let disposed = false;
  let updateTimer: number | undefined;

  const watchRegistration = (reg: ServiceWorkerRegistration) => {
    registration = reg;

    const markIfWaiting = () => {
      // A waiting worker plus a controller means this is an update, not the
      // first install. First installs activate without prompting.
      if (reg.waiting && navigator.serviceWorker.controller) notify(true);
    };

    markIfWaiting();

    reg.addEventListener('updatefound', () => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          notify(true);
        }
      });
    });

    // Long-lived tabs would otherwise never see a deploy.
    updateTimer = window.setInterval(() => {
      void reg.update().catch(() => undefined);
    }, UPDATE_CHECK_INTERVAL_MS);
  };

  void navigator.serviceWorker
    .register(SERVICE_WORKER_URL)
    .then((reg) => {
      if (disposed) return;
      watchRegistration(reg);
    })
    .catch(() => {
      // Offline-first enhancements are best-effort; the app works without them.
    });

  return () => {
    disposed = true;
    if (updateTimer !== undefined) window.clearInterval(updateTimer);
    navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
  };
};
