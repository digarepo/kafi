import { useCallback, useEffect, useRef } from 'react';
import { api } from '../../lib/api';

const EVENTS = [
  'mousedown',
  'keydown',
  'touchstart',
  'wheel',
  'pointerdown',
] as const;

export interface UseSessionInactivityOptions {
  enabled: boolean;
  timeoutMs: number;
}

/**
 * Logs the user out and reloads the app after the configured period without
 * any user interaction. Resets the timer on common user activity events.
 */
export function useSessionInactivity({
  enabled,
  timeoutMs,
}: UseSessionInactivityOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiredRef = useRef(false);

  const logout = useCallback(async () => {
    if (expiredRef.current) {
      return;
    }
    expiredRef.current = true;

    try {
      await api.logout();
    } finally {
      const returnPath = `${window.location.pathname}${window.location.search}`;
      // Force a full page reload to the login page so any cached state is reset.
      window.location.href = `/login?redirect=${encodeURIComponent(returnPath)}`;
    }
  }, []);

  useEffect(() => {
    if (!enabled || timeoutMs <= 0) {
      return;
    }

    const reset = () => {
      if (expiredRef.current) {
        return;
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(logout, timeoutMs);
    };

    const handle = () => reset();

    EVENTS.forEach((event) =>
      window.addEventListener(event, handle, { passive: true }),
    );

    // Start the initial inactivity timer.
    reset();

    return () => {
      EVENTS.forEach((event) => window.removeEventListener(event, handle));
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [enabled, timeoutMs, logout]);
}
