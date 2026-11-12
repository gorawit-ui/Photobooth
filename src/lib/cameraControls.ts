/**
 * Extra camera features a browser may expose (mostly Chrome on Android):
 * hardware zoom, exposure compensation, torch, tap-to-focus and full-
 * resolution still photos via ImageCapture.takePhoto(). Everything is
 * feature-detected: on browsers/cameras without them (Safari, most webcams,
 * capture cards) the booth works exactly as before.
 */

/* Minimal typings — ImageCapture and the image-capture constraints are not in lib.dom. */
interface MediaSettingsRange {
  min: number;
  max: number;
  step: number;
}
interface PhotoCapabilities {
  imageWidth?: MediaSettingsRange;
  imageHeight?: MediaSettingsRange;
}
interface ImageCaptureLike {
  takePhoto(settings?: { imageWidth?: number; imageHeight?: number }): Promise<Blob>;
  getPhotoCapabilities(): Promise<PhotoCapabilities>;
}
type ImageCaptureCtor = new (track: MediaStreamTrack) => ImageCaptureLike;

export interface ExtendedCapabilities extends MediaTrackCapabilities {
  zoom?: MediaSettingsRange;
  exposureCompensation?: MediaSettingsRange;
  torch?: boolean;
  focusMode?: string[];
  exposureMode?: string[];
  pointsOfInterest?: boolean;
}
export interface ExtendedSettings extends MediaTrackSettings {
  zoom?: number;
  exposureCompensation?: number;
  torch?: boolean;
  focusMode?: string;
}

export interface Range {
  min: number;
  max: number;
  step: number;
  value: number;
}

export interface CameraFeatures {
  zoom: Range | null;
  exposure: Range | null;
  torch: boolean;
  tapToFocus: boolean;
  /** Largest still photo the camera can take, if larger than the video frame. */
  still: { width: number; height: number } | null;
}

export const NO_FEATURES: CameraFeatures = { zoom: null, exposure: null, torch: false, tapToFocus: false, still: null };

const imageCaptureCtor = (): ImageCaptureCtor | null =>
  (window as unknown as { ImageCapture?: ImageCaptureCtor }).ImageCapture ?? null;

export function videoTrack(stream: MediaStream | null): MediaStreamTrack | null {
  return stream?.getVideoTracks()[0] ?? null;
}

export function capabilities(track: MediaStreamTrack): ExtendedCapabilities {
  try {
    return (track.getCapabilities?.() ?? {}) as ExtendedCapabilities;
  } catch {
    return {};
  }
}

const range = (r: MediaSettingsRange | undefined, value: number | undefined): Range | null =>
  r && r.max > r.min ? { min: r.min, max: r.max, step: r.step || (r.max - r.min) / 100, value: value ?? r.min } : null;

async function photoCapabilities(track: MediaStreamTrack): Promise<PhotoCapabilities | null> {
  const Ctor = imageCaptureCtor();
  if (!Ctor) return null;
  try {
    return await new Ctor(track).getPhotoCapabilities();
  } catch {
    return null;
  }
}

/** What this camera can do beyond plain video. */
export async function detectFeatures(track: MediaStreamTrack): Promise<CameraFeatures> {
  const caps = capabilities(track);
  const settings = track.getSettings() as ExtendedSettings;
  const photo = await photoCapabilities(track);
  const stillW = photo?.imageWidth?.max ?? 0;
  const stillH = photo?.imageHeight?.max ?? 0;
  // Only worth using when the still is clearly bigger than the video frame
  // (phones); webcams and capture cards report the same size.
  const videoPixels = (settings.width ?? 0) * (settings.height ?? 0);
  const still = stillW * stillH > videoPixels * 1.3 ? { width: stillW, height: stillH } : null;
  return {
    zoom: range(caps.zoom, settings.zoom),
    exposure: range(caps.exposureCompensation, settings.exposureCompensation),
    torch: caps.torch === true,
    tapToFocus: !!caps.pointsOfInterest || !!caps.focusMode?.includes('single-shot'),
    still,
  };
}

async function apply(track: MediaStreamTrack, c: Record<string, unknown>): Promise<void> {
  try {
    await track.applyConstraints({ advanced: [c as MediaTrackConstraintSet] });
  } catch (err) {
    console.warn('Camera setting not applied', c, err);
  }
}

export const setZoom = (track: MediaStreamTrack, zoom: number) => apply(track, { zoom });
export const setExposure = (track: MediaStreamTrack, exposureCompensation: number) =>
  apply(track, { exposureCompensation });
export const setTorch = (track: MediaStreamTrack, torch: boolean) => apply(track, { torch });

/** Prefer continuous autofocus/exposure where the camera lets us choose. */
export async function preferContinuous(track: MediaStreamTrack): Promise<void> {
  const caps = capabilities(track);
  const c: Record<string, unknown> = {};
  if (caps.focusMode?.includes('continuous')) c.focusMode = 'continuous';
  if (caps.exposureMode?.includes('continuous')) c.exposureMode = 'continuous';
  if (Object.keys(c).length) await apply(track, c);
}

/** Focus (and meter) on a point of the picture, x/y in 0..1 of the camera frame. */
export async function focusAt(track: MediaStreamTrack, x: number, y: number): Promise<void> {
  const caps = capabilities(track);
  const c: Record<string, unknown> = {};
  if (caps.pointsOfInterest) c.pointsOfInterest = [{ x, y }];
  if (caps.focusMode?.includes('single-shot')) c.focusMode = 'single-shot';
  if (!Object.keys(c).length) return;
  await apply(track, c);
  // Return to continuous AF so the next guest is in focus too.
  window.setTimeout(() => void preferContinuous(track), 2500);
}

/**
 * Take a full-resolution still and return it at the video frame's aspect
 * (centre crop), so it matches what the preview showed. Downscaled to at most
 * `maxHeight` px tall. Resolves null if the camera cannot take a photo.
 */
export async function takeStill(
  track: MediaStreamTrack,
  still: { width: number; height: number },
  videoAspect: number,
  maxHeight: number,
  timeoutMs = 4000,
): Promise<HTMLCanvasElement | null> {
  const Ctor = imageCaptureCtor();
  if (!Ctor) return null;
  try {
    const blob = await Promise.race([
      new Ctor(track).takePhoto({ imageWidth: still.width, imageHeight: still.height }),
      new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('takePhoto timeout')), timeoutMs)),
    ]);
    const bmp = await createImageBitmap(blob); // EXIF orientation is applied by default
    let sw = bmp.width;
    let sh = bmp.height;
    if (sw / sh > videoAspect) sw = sh * videoAspect;
    else sh = sw / videoAspect;
    const scale = Math.min(1, maxHeight / sh);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(sw * scale);
    canvas.height = Math.round(sh * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, (bmp.width - sw) / 2, (bmp.height - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height);
    bmp.close();
    return canvas;
  } catch (err) {
    console.warn('Full-resolution photo failed, using the video frame', err);
    return null;
  }
}

/** Plain-language report for the camera info panel. */
export async function describeCamera(stream: MediaStream | null, devices: MediaDeviceInfo[]) {
  const track = videoTrack(stream);
  const lines: [string, string][] = [];
  if (!track) return { lines: [['สถานะ', 'ยังไม่ได้เปิดกล้อง']] as [string, string][], devices };
  const s = track.getSettings() as ExtendedSettings;
  const caps = capabilities(track);
  const photo = await photoCapabilities(track);
  lines.push(['กล้องที่ใช้', track.label || '-']);
  lines.push(['ภาพสดตอนนี้', `${s.width ?? '?'}×${s.height ?? '?'} px · ${s.frameRate ? Math.round(s.frameRate) : '?'} fps`]);
  if (caps.width?.max && caps.height?.max) lines.push(['ภาพสดสูงสุดที่กล้องให้', `${caps.width.max}×${caps.height.max} px`]);
  lines.push([
    'ภาพนิ่งความละเอียดสูง',
    photo?.imageWidth?.max ? `${photo.imageWidth.max}×${photo.imageHeight?.max ?? '?'} px` : 'ไม่รองรับในเบราว์เซอร์นี้',
  ]);
  lines.push(['ซูม', caps.zoom ? `${caps.zoom.min}× – ${caps.zoom.max}×` : 'ไม่รองรับ']);
  lines.push(['ปรับความสว่าง', caps.exposureCompensation ? `${caps.exposureCompensation.min} ถึง +${caps.exposureCompensation.max}` : 'ไม่รองรับ']);
  lines.push(['โฟกัส', caps.focusMode?.length ? caps.focusMode.join(', ') : 'ไม่รองรับการตั้งค่า']);
  lines.push(['แตะเพื่อโฟกัส', caps.pointsOfInterest ? 'รองรับ' : 'ไม่รองรับ']);
  lines.push(['ไฟฉาย', caps.torch ? 'มี' : 'ไม่มี']);
  lines.push(['เบราว์เซอร์', navigator.userAgent]);
  return { lines, devices };
}
