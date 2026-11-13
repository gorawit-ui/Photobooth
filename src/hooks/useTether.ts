import { useCallback, useEffect, useState } from 'react';
import { loadSettings, saveSettings } from '../lib/boothSettings';
import { fetchTetherStatus, type TetherStatus } from '../lib/tether';

export interface TetherState {
  /** Staff turned the Sony Bridge on (remembered on this computer). */
  enabled: boolean;
  url: string;
  /** off · checking · missing (bridge not running) · nocamera · ready */
  state: 'off' | 'checking' | 'missing' | 'nocamera' | 'ready';
  status: TetherStatus | null;
  /** Shots come from the real camera. */
  shootsStills: boolean;
  /** The bridge can stream live view (listed in the camera picker). */
  hasLiveview: boolean;
  setEnabled: (on: boolean) => void;
  setUrl: (url: string) => void;
}

const POLL_MS = 3000;

/** Watches the Sony Bridge while the booth screens are open. */
export function useTether(active: boolean): TetherState {
  const [enabled, setEnabledState] = useState(() => loadSettings().tetherEnabled);
  const [url, setUrlState] = useState(() => loadSettings().tetherUrl);
  const [status, setStatus] = useState<TetherStatus | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!enabled || !active) {
      setStatus(null);
      setChecked(false);
      return;
    }
    let alive = true;
    let timer = 0;
    let misses = 0;
    let checkedOnce = false;
    const poll = async () => {
      const s = await fetchTetherStatus(url);
      if (!alive) return;
      // One missed answer (bridge busy with a shot) is not "gone".
      if (!s && ++misses < 2 && checkedOnce) {
        timer = window.setTimeout(poll, 1000);
        return;
      }
      if (s) misses = 0;
      checkedOnce = true;
      // Keep the object identity when nothing changed (avoids re-renders / camera reopen).
      setStatus((prev) => (JSON.stringify(prev) === JSON.stringify(s) ? prev : s));
      setChecked(true);
      timer = window.setTimeout(poll, POLL_MS);
    };
    void poll();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [enabled, active, url]);

  const setEnabled = useCallback((on: boolean) => {
    saveSettings({ tetherEnabled: on });
    setEnabledState(on);
  }, []);
  const setUrl = useCallback((next: string) => {
    saveSettings({ tetherUrl: next });
    setUrlState(loadSettings().tetherUrl);
  }, []);

  const state: TetherState['state'] = !enabled
    ? 'off'
    : !checked
      ? 'checking'
      : !status
        ? 'missing'
        : !status.camera
          ? 'nocamera'
          : 'ready';

  return {
    enabled,
    url,
    state,
    status,
    // "busy" is a shot in progress — still the camera to use.
    shootsStills: state === 'ready',
    hasLiveview: !!status?.liveview && state === 'ready',
    setEnabled,
    setUrl,
  };
}
