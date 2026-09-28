/**
 * Screen Wake Lock wrapper. Silently does nothing on browsers without
 * support (e.g. older Safari) or when the request is rejected.
 */

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
}
type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
};

export function isWakeLockSupported(): boolean {
  return 'wakeLock' in navigator;
}

export async function requestWakeLock(): Promise<WakeLockSentinelLike | null> {
  const nav = navigator as WakeLockNavigator;
  if (!nav.wakeLock) return null;
  try {
    return await nav.wakeLock.request('screen');
  } catch {
    // Not allowed (hidden tab, low battery, policy...) — ignore.
    return null;
  }
}
