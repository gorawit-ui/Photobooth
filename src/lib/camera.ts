import { CAMERA_IDEAL_HEIGHT, CAMERA_IDEAL_WIDTH } from '../config/app';

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
    width: { ideal: CAMERA_IDEAL_WIDTH },
    height: { ideal: CAMERA_IDEAL_HEIGHT },
  };
  if (deviceId) video.deviceId = { exact: deviceId };
  else video.facingMode = 'user';

  try {
    return await navigator.mediaDevices.getUserMedia({ video, audio: false });
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
 * Grab the current video frame at full camera resolution, un-mirrored.
 * Mirroring is applied later during composition (see MIRROR_OUTPUT).
 */
export function captureFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) throw new Error('Video not ready');
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas not available');
  ctx.drawImage(video, 0, 0, w, h);
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
