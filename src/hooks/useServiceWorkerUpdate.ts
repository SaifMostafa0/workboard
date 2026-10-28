import {
  applyServiceWorkerUpdate,
  registerServiceWorker,
  subscribeToServiceWorkerUpdate,
} from '@/lib/serviceWorker';
import { useEffect, useState } from 'react';

/**
 * Registers the service worker once per app session and exposes whether a new
 * version is waiting. The reload is user-initiated to avoid losing form state.
 */
export function useServiceWorkerUpdate(): { updateReady: boolean; applyUpdate: () => void } {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToServiceWorkerUpdate(setUpdateReady);
    const unregister = registerServiceWorker();
    return () => {
      unsubscribe();
      unregister();
    };
  }, []);

  return { updateReady, applyUpdate: applyServiceWorkerUpdate };
}
