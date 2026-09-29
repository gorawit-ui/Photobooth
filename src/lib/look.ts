/**
 * Photo "look" pipeline: crop → (magic background) → colour filter → outputs.
 *
 * prepareShots() does the slow part once per session (cropping + person
 * segmentation). renderOutputs() is cheap and re-runs whenever the guest
 * changes the scene toggle or filter on the result screen.
 */

import { JPG_QUALITY, MAGIC_SCENE_IMAGE, MIN_PERSON_COVERAGE } from '../config/app';
import type { FrameConfig } from '../config/frames';
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
  /** The shot cropped to the slot's shape (mirror already applied). */
  photo: HTMLCanvasElement;
  /** Same crop with the magic background, or null if not possible. */
  scene: HTMLCanvasElement | null;
}

export interface Prepared {
  shots: PreparedShot[];
  /** Photo width / height (the frame's slot shape). */
  aspect: number;
  /** True if at least one shot got a magic background. */
  sceneAvailable: boolean;
}

function sizeOf(src: Drawable) {
  return src instanceof HTMLImageElement
    ? { w: src.naturalWidth, h: src.naturalHeight }
    : { w: src.width, h: src.height };
}

/** Center-crop to `aspect` at source resolution (max 1080 px tall), optionally mirrored. */
function cropToAspect(src: Drawable, aspect: number, mirror: boolean): HTMLCanvasElement {
  const { w, h } = sizeOf(src);
  let cw = w;
  let ch = h;
  if (w / h > aspect) cw = h * aspect;
  else ch = w / aspect;
  const outH = Math.round(Math.min(ch, 1080));
  const outW = Math.round(outH * aspect);
  const canvas = createCanvas(outW, outH);
  const ctx = get2d(canvas);
  ctx.imageSmoothingQuality = 'high';
  if (mirror) {
    ctx.translate(outW, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(src, (w - cw) / 2, (h - ch) / 2, cw, ch, 0, 0, outW, outH);
  return canvas;
}

const nextTick = () => new Promise<void>((r) => window.setTimeout(r, 0));

export function slotAspect(frame: FrameConfig): number {
  const slot = frame.slots[0];
  return slot.width / slot.height;
}

/**
 * Crop one shot and give it the magic background (if a person is found).
 * Runs right after each shot is taken, during the pause before the next
 * countdown, so nothing is left to do after the last shot but the outputs.
 */
export async function prepareShot(src: Drawable, aspect: number, mirror: boolean): Promise<PreparedShot> {
  const photo = cropToAspect(src, aspect, mirror);
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
  return { photo, scene };
}

export function assemblePrepared(shots: PreparedShot[], aspect: number): Prepared {
  return { shots, aspect, sceneAvailable: shots.some((s) => s.scene) };
}

/** Prepare all shots in one go (used when the per-shot results are missing). */
export async function prepareShots(frame: FrameConfig, shots: Drawable[], mirror: boolean): Promise<Prepared> {
  const aspect = slotAspect(frame);
  const out: PreparedShot[] = [];
  for (const s of shots) {
    out.push(await prepareShot(s, aspect, mirror));
    await nextTick(); // keep the loader animating
  }
  return assemblePrepared(out, aspect);
}

export function disposePrepared(p: Prepared | null): void {
  p?.shots.forEach((s) => {
    releaseCanvas(s.photo);
    if (s.scene) releaseCanvas(s.scene);
  });
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
    const composed = composeFrame(frame, assets, jpgPhotos, { mirror: false });
    temp.push(composed);
    const jpg = await canvasToBlob(composed, 'image/jpeg', JPG_QUALITY);
    await nextTick();
    const gifPhotos = prepared.shots.map((s) => filtered(s.photo));
    const gif = await createGif(gifPhotos, prepared.aspect, false);
    return { jpg, gif };
  } finally {
    temp.forEach(releaseCanvas);
  }
}
