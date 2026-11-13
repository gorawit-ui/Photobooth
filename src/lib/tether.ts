/**
 * Talks to the Sony Bridge (tether/sony-bridge.mjs), a small program running
 * on the booth computer that fires the real camera's shutter over USB and
 * hands back its full-resolution JPEG. Optional: off unless staff turn it on
 * in the camera info panel, and every failure falls back to the normal camera.
 */

import { CameraError } from './camera';

export const TETHER_DEFAULT_URL = 'http://127.0.0.1:5123';
/** Pseudo camera id for "live view from the bridge" in the camera picker. */
export const TETHER_DEVICE_ID = 'sony-bridge-liveview';
export const TETHER_DEVICE_LABEL = 'Sony · ภาพสดจากโปรแกรมตัวกลาง';

export interface TetherStatus {
  ok: boolean;
  version: number;
  backend: string;
  camera: string | null;
  ready: boolean;
  busy: boolean;
  liveview: boolean;
}

const clean = (base: string) => base.replace(/\/+$/, '');

async function withTimeout<T>(ms: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), ms);
  try {
    return await run(ctrl.signal);
  } finally {
    window.clearTimeout(timer);
  }
}

/** null when the bridge is not running / not reachable. */
export async function fetchTetherStatus(base: string): Promise<TetherStatus | null> {
  try {
    return await withTimeout(2000, async (signal) => {
      const r = await fetch(`${clean(base)}/status`, { signal, cache: 'no-store' });
      if (!r.ok) return null;
      const s = (await r.json()) as TetherStatus;
      return s?.ok ? s : null;
    });
  } catch {
    return null;
  }
}

/**
 * Fire the shutter and return the camera's photo, downscaled to at most
 * `maxHeight` px tall (aspect kept: the slot crop happens later, so a 3:2
 * still lines up with a 3:2 live view or a pillarboxed HDMI picture).
 */
export async function tetherCapture(base: string, maxHeight: number): Promise<HTMLCanvasElement> {
  const root = clean(base);
  const shot = await withTimeout(30000, async (signal) => {
    const r = await fetch(`${root}/capture`, { method: 'POST', signal, cache: 'no-store' });
    const body = (await r.json().catch(() => ({}))) as { ok?: boolean; url?: string; error?: string };
    if (!r.ok || !body.ok || !body.url) throw new Error(body.error || `capture failed (${r.status})`);
    return body.url;
  });
  const blob = await withTimeout(30000, async (signal) => {
    const r = await fetch(`${root}${shot}`, { signal, cache: 'no-store' });
    if (!r.ok) throw new Error(`photo download failed (${r.status})`);
    return r.blob();
  });
  const bmp = await createImageBitmap(blob); // EXIF orientation applied
  try {
    const scale = Math.min(1, maxHeight / bmp.height);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas not available');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    bmp.close();
  }
}

/** Cleanup for streams made from the bridge's live view (see stopStream). */
const cleanups = new WeakMap<MediaStreamTrack, () => void>();
export function releaseTetherTrack(track: MediaStreamTrack): void {
  cleanups.get(track)?.();
  cleanups.delete(track);
}

/**
 * The bridge's MJPEG live view as a MediaStream, so the rest of the booth
 * treats it like any camera (preview, fallback frame grabs).
 */
export async function openTetherPreview(base: string): Promise<MediaStream> {
  const root = clean(base);
  const img = new Image();
  img.crossOrigin = 'anonymous'; // keeps the canvas readable (bridge sends CORS)
  img.decoding = 'async';
  let stopped = false;
  let retry = 0;
  const connect = () => {
    if (!stopped) img.src = `${root}/liveview?t=${Date.now()}`;
  };
  img.onerror = () => {
    if (stopped) return;
    retry = window.setTimeout(connect, 1000); // bridge restarted: reconnect
  };
  connect();

  // Wait for the first frame.
  const start = performance.now();
  while (!img.naturalWidth) {
    if (performance.now() - start > 8000) {
      stopped = true;
      img.src = '';
      throw new CameraError('notfound', 'Sony Bridge live view not available');
    }
    await new Promise((r) => window.setTimeout(r, 100));
  }

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  const draw = () => {
    if (!img.naturalWidth) return;
    if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }
    ctx.drawImage(img, 0, 0);
  };
  draw();
  const timer = window.setInterval(draw, 1000 / 20);
  const stream = canvas.captureStream(20);
  const track = stream.getVideoTracks()[0];
  cleanups.set(track, () => {
    stopped = true;
    window.clearInterval(timer);
    window.clearTimeout(retry);
    img.onerror = null;
    img.src = '';
  });
  return stream;
}

/** Looks like a MediaDeviceInfo so the camera picker can list the bridge's live view. */
export const TETHER_DEVICE = {
  deviceId: TETHER_DEVICE_ID,
  groupId: 'sony-bridge',
  kind: 'videoinput',
  label: TETHER_DEVICE_LABEL,
  toJSON() {
    return this;
  },
} as MediaDeviceInfo;
