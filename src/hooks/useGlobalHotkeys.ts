import { hasModifier, isEditableTarget } from '@/lib/hotkeys';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface GlobalHotkeysOptions {
  onOpenPalette: () => void;
  onOpenShortcuts: () => void;
}

const GO_SEQUENCE_TIMEOUT_MS = 1200;

/** Routes reachable through the `g`-prefixed "go to" sequences. */
const GO_ROUTES: Record<string, string> = {
  d: '/',
  p: '/projects',
  t: '/tasks',
  r: '/trash',
  s: '/settings',
};

/**
 * Registers the app-wide keyboard shortcuts:
 *  - Ctrl/⌘ + K: command palette
 *  - ?: keyboard shortcuts help
 *  - g then d/p/t/r/s: jump to Dashboard/Projects/Tasks/Trash/Settings
 */
export function useGlobalHotkeys({ onOpenPalette, onOpenShortcuts }: GlobalHotkeysOptions) {
  const navigate = useNavigate();
  const awaitingGoRef = useRef(false);
  const goTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearGo = () => {
      awaitingGoRef.current = false;
      if (goTimerRef.current) {
        clearTimeout(goTimerRef.current);
        goTimerRef.current = null;
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // The palette shortcut works everywhere, including inside inputs.
      if (hasModifier(event) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        clearGo();
        onOpenPalette();
        return;
      }

      // Other shortcuts are single keys, so ignore them while typing or with
      // any modifier held (so browser/OS shortcuts keep working).
      if (isEditableTarget(event.target) || hasModifier(event) || event.altKey) {
        return;
      }

      if (event.key === '?') {
        event.preventDefault();
        clearGo();
        onOpenShortcuts();
        return;
      }

      if (awaitingGoRef.current) {
        const route = GO_ROUTES[event.key.toLowerCase()];
        clearGo();
        if (route) {
          event.preventDefault();
          navigate(route);
        }
        return;
      }

      if (event.key.toLowerCase() === 'g') {
        awaitingGoRef.current = true;
        goTimerRef.current = setTimeout(clearGo, GO_SEQUENCE_TIMEOUT_MS);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearGo();
    };
  }, [navigate, onOpenPalette, onOpenShortcuts]);
}
