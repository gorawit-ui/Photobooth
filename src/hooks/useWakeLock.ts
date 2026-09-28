import { useEffect } from 'react';
import { requestWakeLock } from '../lib/wakeLock';

/**
 * Keep the screen awake for the lifetime of the app. The lock is dropped by
 * the browser when the tab is hidden, so re-acquire it on return.
 * No-op on browsers without the Wake Lock API.
 */
export function useWakeLock() {
  useEffect(() => {
    let sentinel: Awaited<ReturnType<typeof requestWakeLock>> = null;
    let disposed = false;

    const acquire = async () => {
      if (document.visibilityState !== 'visible') return;
      if (sentinel && !sentinel.released) return;
      const s = await requestWakeLock();
      if (disposed) s?.release().catch(() => {});
      else sentinel = s;
    };

    acquire();
    // Some browsers only grant the lock after a user gesture.
    const onGesture = () => acquire();
    document.addEventListener('visibilitychange', acquire);
    window.addEventListener('pointerdown', onGesture, { passive: true });
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', acquire);
      window.removeEventListener('pointerdown', onGesture);
      sentinel?.release().catch(() => {});
    };
  }, []);
}
