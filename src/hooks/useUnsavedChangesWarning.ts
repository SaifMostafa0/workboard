import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

const MESSAGE = 'You have unsaved changes. Leave without saving?';

/**
 * Warns before navigating away from a view with unsaved changes.
 *
 * Built on React Router's navigation blocker, so the app must be rendered
 * inside a data router (`createBrowserRouter` + `RouterProvider`). In-app
 * navigations and `beforeunload` both funnel through the blocker.
 */
export function useUnsavedChangesWarning(when: boolean): void {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      when && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;

    if (window.confirm(MESSAGE)) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);
}
