/**
 * Per-device booth settings remembered in localStorage (so a refresh on the
 * event machine keeps the Sony capture card and the preview orientation).
 * Every access is wrapped: private mode / blocked storage just uses defaults.
 */

const KEY = 'magical-booth-settings';

export interface BoothSettings {
  /** deviceId of the camera picked on the capture screen. */
  cameraId?: string;
  /**
   * Mirror the live preview like a bathroom mirror. Off by default so the
   * preview matches the saved photos exactly.
   */
  mirrorPreview: boolean;
  /** Ambient motion on the landing background paused by staff. */
  motionPaused: boolean;
  /** Shoot with the real camera through the Sony Bridge (tether/sony-bridge.mjs). */
  tetherEnabled: boolean;
  /** Where the bridge listens. */
  tetherUrl: string;
}

const DEFAULTS: BoothSettings = {
  mirrorPreview: false,
  motionPaused: false,
  tetherEnabled: false,
  tetherUrl: 'http://127.0.0.1:5123',
};

export function loadSettings(): BoothSettings {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const v = JSON.parse(raw) as Partial<BoothSettings>;
    return {
      cameraId: typeof v.cameraId === 'string' && v.cameraId ? v.cameraId : undefined,
      mirrorPreview: typeof v.mirrorPreview === 'boolean' ? v.mirrorPreview : DEFAULTS.mirrorPreview,
      motionPaused: typeof v.motionPaused === 'boolean' ? v.motionPaused : DEFAULTS.motionPaused,
      tetherEnabled: typeof v.tetherEnabled === 'boolean' ? v.tetherEnabled : DEFAULTS.tetherEnabled,
      tetherUrl: typeof v.tetherUrl === 'string' && /^https?:\/\//.test(v.tetherUrl) ? v.tetherUrl : DEFAULTS.tetherUrl,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(patch: Partial<BoothSettings>): BoothSettings {
  const next = { ...loadSettings(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: keep working with in-memory values */
  }
  return next;
}
