/**
 * Photo "look" pipeline: crop → (magic background) → colour filter → outputs.
 *
 * prepareShots() does the slow part once per session (cropping + person
 * segmentation). renderOutputs() is cheap and re-runs whenever the guest
 * changes the scene toggle or filter on the result screen.
 */

import { AUTO_BRIGHTEN, CROP_FOCAL_Y, EXPORT_LONG_SIDE, JPG_QUALITY, MAGIC_SCENE_IMAGE, MIN_PERSON_COVERAGE } from '../config/app';
import { frameSize, type FrameConfig } from '../config/frames';
import { applyCurve, exposureCurve } from './autoExposure';
import { canvasToBlob, createCanvas, get2d, releaseCanvas } from './canvas';
import { composeFrame, type Drawable, type FrameAssets } from './compose';
import { applyFilter, type FilterId } from './filters';
import { createGif } from './gif';
import { composeScene, loadSceneImage, personCoverage } from './scene';
import { segmentPerson } from './segment';

export interface Look {
  /** Use the magic background (when available for a shot). */
  scene: boolean;
  filter: FilterId;
}

export interface PreparedShot {
  /** The shot cropped to its slot's shape (mirror already applied). */
  photo: HTMLCanvasElement;
  /** Same crop with the magic background, or null if not possible. */
  scene: HTMLCanvasElement | null;
  /** Crop for the GIF when the GIF shape differs from the slot, else null (use `photo`). */
  gif: HTMLCanvasElement | null;
}

export interface Prepared {
  shots: PreparedShot[];
  /** GIF frame width / height (shared by every shot). */
  aspect: number;
  /** True if at least one shot got a magic background. */
  sceneAvailable: boolean;
}

function sizeOf(src: Drawable) {
  return src instanceof HTMLImageElement
    ? { w: src.naturalWidth, h: src.naturalHeight }
    : { w: src.width, h: src.height };
}

/** Final JPG size for a frame: its own pixel space scaled to EXPORT_LONG_SIDE. */
export function exportSize(frame: FrameConfig): { width: number; height: number; scale: number } {
  const { width, height } = frameSize(frame);
  const scale = Math.max(1, EXPORT_LONG_SIDE / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale), scale };
}

/** Crop to `aspect` at source resolution (at most `maxHeight` px tall), optionally mirrored.
 *  Centred horizontally; vertically at CROP_FOCAL_Y. */
function cropToAspect(src: Drawable, aspect: number, mirror: boolean, maxHeight: number): HTMLCanvasElement {
  const { w, h } = sizeOf(src);
  let cw = w;
  let ch = h;
  if (w / h > aspect) cw = h * aspect;
  else ch = w / aspect;
  const outH = Math.round(Math.min(ch, maxHeight));
  const outW = Math.round(outH * aspect);
  const canvas = createCanvas(outW, outH);
  const ctx = get2d(canvas);
  ctx.imageSmoothingQuality = 'high';
  if (mirror) {
    ctx.translate(outW, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(src, (w - cw) / 2, (h - ch) * CROP_FOCAL_Y, cw, ch, 0, 0, outW, outH);
  return canvas;
}

const nextTick = () => new Promise<void>((r) => window.setTimeout(r, 0));

/** Width / height of the slot that shot `index` goes into. */
export function slotAspect(frame: FrameConfig, index = 0): number {
  const slot = frame.slots[index] ?? frame.slots[0];
  return slot.width / slot.height;
}

/** GIF shape limits: very wide or very tall slots make an unwatchable GIF. */
const GIF_MIN_ASPECT = 3 / 4;
const GIF_MAX_ASPECT = 3 / 2;
const GIF_MIXED_ASPECT = 4 / 5;

/**
 * One shape for every GIF frame: the slot shape if all slots share it
 * (classic 2x2 frames — same crop as the print), otherwise 4:5. Clamped so
 * strip-shaped slots still give a watchable GIF.
 */
export function gifAspect(frame: FrameConfig): number {
  const aspects = frame.slots.map((s) => s.width / s.height);
  const uniform = aspects.every((a) => Math.abs(a / aspects[0] - 1) < 0.01);
  const a = uniform ? aspects[0] : GIF_MIXED_ASPECT;
  return Math.min(GIF_MAX_ASPECT, Math.max(GIF_MIN_ASPECT, a));
}

const sameAspect = (a: number, b: number) => Math.abs(a / b - 1) < 0.005;

/**
 * Crop one shot and give it the magic background (if a person is found).
 * Runs right after each shot is taken, during the pause before the next
 * countdown, so nothing is left to do after the last shot but the outputs.
 */
export async function prepareShot(
  src: Drawable,
  aspect: number,
  gifShape: number,
  mirror: boolean,
  maxHeight = 1080,
): Promise<PreparedShot> {
  const photo = cropToAspect(src, aspect, mirror, maxHeight);
  // The GIF is small (GIF_WIDTH wide), 1080 px is plenty.
  const gif = sameAspect(aspect, gifShape) ? null : cropToAspect(src, gifShape, mirror, 1080);
  if (AUTO_BRIGHTEN) {
    // One curve from the slot crop, applied to both crops so JPG and GIF match.
    const curve = exposureCurve(photo);
    if (curve) {
      applyCurve(photo, curve);
      if (gif) applyCurve(gif, curve);
    }
  }
  let scene: HTMLCanvasElement | null = null;
  try {
    const bg = await loadSceneImage(MAGIC_SCENE_IMAGE);
    if (bg) {
      const mask = await segmentPerson(photo);
      if (personCoverage(mask) >= MIN_PERSON_COVERAGE) scene = composeScene(photo, mask, bg);
    }
  } catch (err) {
    console.warn('Magic background unavailable for this shot, using the real background', err);
  }
  return { photo, scene, gif };
}

/** Prepare shot `index` for `frame`. */
export function prepareShotFor(frame: FrameConfig, src: Drawable, index: number, mirror: boolean) {
  // Keep exactly the detail the slot needs in the exported JPG — no more (phone memory).
  const slot = frame.slots[index] ?? frame.slots[0];
  const maxHeight = Math.ceil(slot.height * exportSize(frame).scale);
  return prepareShot(src, slotAspect(frame, index), gifAspect(frame), mirror, maxHeight);
}

export function assemblePrepared(frame: FrameConfig, shots: PreparedShot[]): Prepared {
  return { shots, aspect: gifAspect(frame), sceneAvailable: shots.some((s) => s.scene) };
}

/** Prepare all shots in one go (used when the per-shot results are missing). */
export async function prepareShots(frame: FrameConfig, shots: Drawable[], mirror: boolean): Promise<Prepared> {
  const out: PreparedShot[] = [];
  for (let i = 0; i < shots.length; i++) {
    out.push(await prepareShotFor(frame, shots[i], i, mirror));
    await nextTick(); // keep the loader animating
  }
  return assemblePrepared(frame, out);
}

export function disposePreparedShot(s: PreparedShot | null): void {
  if (!s) return;
  releaseCanvas(s.photo);
  if (s.scene) releaseCanvas(s.scene);
  if (s.gif) releaseCanvas(s.gif);
}

export function disposePrepared(p: Prepared | null): void {
  p?.shots.forEach(disposePreparedShot);
}

/** JPG (frame + photos with the chosen look) and GIF (photos only, real background). */
export async function renderOutputs(
  frame: FrameConfig,
  assets: FrameAssets,
  prepared: Prepared,
  look: Look,
): Promise<{ jpg: Blob; gif: Blob }> {
  const temp: HTMLCanvasElement[] = [];
  const filtered = (c: HTMLCanvasElement) => {
    const out = applyFilter(c, look.filter);
    if (out !== c) temp.push(out);
    return out;
  };
  try {
    const jpgPhotos = prepared.shots.map((s) => filtered((look.scene && s.scene) || s.photo));
    const { width, height } = exportSize(frame);
    const composed = composeFrame(frame, assets, jpgPhotos, { width, height, mirror: false });
    temp.push(composed);
    const jpg = await canvasToBlob(composed, 'image/jpeg', JPG_QUALITY);
    await nextTick();
    const gifPhotos = prepared.shots.map((s) => filtered(s.gif ?? s.photo));
    const gif = await createGif(gifPhotos, prepared.aspect, false);
    return { jpg, gif };
  } finally {
    temp.forEach(releaseCanvas);
  }
}
