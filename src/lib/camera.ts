import {
  CAMERA_IDEAL_HEIGHT,
  CAMERA_IDEAL_WIDTH,
  MAX_CAPTURE_HEIGHT,
  MOBILE_CAMERA_IDEAL_HEIGHT,
  MOBILE_CAMERA_IDEAL_WIDTH,
} from '../config/app';
import { isMobileDevice } from './device';

export type CameraErrorKind =
  | 'denied' // user or OS blocked the permission
  | 'notfound' // no camera attached
  | 'inuse' // another app holds the camera
  | 'insecure' // page not served over HTTPS / localhost
  | 'unsupported' // no getUserMedia at all
  | 'unknown';

export class CameraError extends Error {
  readonly kind: CameraErrorKind;
  constructor(kind: CameraErrorKind, message?: string) {
    super(message ?? kind);
    this.kind = kind;
  }
}

function classify(err: unknown): CameraError {
  if (err instanceof CameraError) return err;
  const name = err instanceof DOMException || err instanceof Error ? err.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return new CameraError('denied');
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return new CameraError('notfound');
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return new CameraError('inuse');
    default:
      return new CameraError('unknown', String(err));
  }
}

/**
 * Open a camera. With no deviceId the front camera (facingMode "user") is
 * preferred. Throws CameraError.
 */
export async function openCamera(deviceId?: string): Promise<MediaStream> {
  if (!window.isSecureContext) throw new CameraError('insecure');
  if (!navigator.mediaDevices?.getUserMedia) throw new CameraError('unsupported');

  const video: MediaTrackConstraints = {
    width: { ideal: isMobileDevice ? MOBILE_CAMERA_IDEAL_WIDTH : CAMERA_IDEAL_WIDTH },
    height: { ideal: isMobileDevice ? MOBILE_CAMERA_IDEAL_HEIGHT : CAMERA_IDEAL_HEIGHT },
    frameRate: { ideal: 30 },
  };
  if (deviceId) video.deviceId = { exact: deviceId };
  else video.facingMode = 'user';

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
    await useBestMode(stream);
    return stream;
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    // Some webcams reject the constraints — retry with the simplest request.
    if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: deviceId ? { deviceId } : true,
          audio: false,
        });
      } catch (err2) {
        throw classify(err2);
      }
    }
    throw classify(err);
  }
}

/** Largest picture we ask a computer camera for (4K UHD). */
const MAX_MODE = { width: 3840, height: 2160 };

/**
 * The browser opens the mode closest to the "ideal" request, which can leave a
 * better camera (4K webcam, capture card, a phone's back camera) below what it
 * can really give. Ask for the largest mode the camera advertises, keeping at
 * least ~20 fps so the live preview stays smooth; if the camera refuses, keep
 * the mode it opened with.
 */
async function useBestMode(stream: MediaStream): Promise<void> {
  const track = stream.getVideoTracks()[0];
  if (!track?.getCapabilities) return;
  const caps = track.getCapabilities();
  const s = track.getSettings();
  const maxW = Math.min(caps.width?.max ?? 0, MAX_MODE.width);
  const maxH = Math.min(caps.height?.max ?? 0, MAX_MODE.height);
  if (!maxW || !maxH || (maxW * maxH <= (s.width ?? 0) * (s.height ?? 0))) return;
  const before = { width: s.width, height: s.height, frameRate: s.frameRate };
  try {
    await track.applyConstraints({
      width: { ideal: maxW },
      height: { ideal: maxH },
      frameRate: { ideal: 30, min: 20 },
    });
  } catch {
    // Not available at a usable frame rate: go back to the original mode.
    try {
      await track.applyConstraints({ width: { ideal: before.width }, height: { ideal: before.height }, frameRate: { ideal: 30 } });
    } catch {
      /* keep whatever the camera has */
    }
  }
}

/** Below this the camera itself is the limit (e.g. Sony Imaging Edge Webcam ≈ 1024×576). */
export const LOW_RES_HEIGHT = 720;

export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((t) => t.stop());
}

/** Video inputs. Labels are only filled in after permission was granted. */
export async function listCameras(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    return all.filter((d) => d.kind === 'videoinput' && d.deviceId);
  } catch {
    return [];
  }
}

export function activeDeviceId(stream: MediaStream | null): string | undefined {
  return stream?.getVideoTracks()[0]?.getSettings().deviceId;
}

/**
 * Grab the current video frame, un-mirrored, at camera resolution (scaled
 * down to MAX_CAPTURE_HEIGHT for 4K phone streams).
 * Mirroring is applied later during composition (see MIRROR_OUTPUT).
 */
export function captureFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) throw new Error('Video not ready');
  const scale = Math.min(1, MAX_CAPTURE_HEIGHT / vh);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(vw * scale);
  canvas.height = Math.round(vh * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas not available');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Resolves once the video element has real frame dimensions. */
export function waitForVideo(video: HTMLVideoElement, timeoutMs = 8000): Promise<void> {
  if (video.videoWidth && video.readyState >= 2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const tick = () => {
      if (video.videoWidth && video.readyState >= 2) resolve();
      else if (performance.now() - start > timeoutMs) reject(new Error('Video timeout'));
      else window.setTimeout(tick, 100);
    };
    tick();
  });
}
