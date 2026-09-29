/**
 * "Magic background": keep the people from a photo and replace everything
 * else with a prepared scene image.
 */

import { createCanvas, get2d, loadImage } from './canvas';
import type { PersonMask } from './segment';

const bgCache = new Map<string, Promise<HTMLImageElement | null>>();

export function loadSceneImage(url: string): Promise<HTMLImageElement | null> {
  let p = bgCache.get(url);
  if (!p) {
    p = loadImage(url);
    bgCache.set(url, p);
  }
  return p;
}

/** Share of the photo that is (probably) a person — used to skip empty shots. */
export function personCoverage(mask: PersonMask): number {
  let n = 0;
  for (let i = 0; i < mask.data.length; i++) if (mask.data[i] > 0.5) n++;
  return n / mask.data.length;
}

const smoothstep = (lo: number, hi: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
};

/**
 * Soft alpha matte (canvas, photo size) from the person mask.
 * The threshold pulls the edge slightly inward so less wall shows around
 * people; a down/up-scale pass feathers the edge.
 */
function buildMatte(mask: PersonMask, width: number, height: number): HTMLCanvasElement {
  const raw = createCanvas(mask.width, mask.height);
  const rctx = get2d(raw);
  const img = rctx.createImageData(mask.width, mask.height);
  for (let i = 0; i < mask.data.length; i++) {
    const o = i * 4;
    img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
    img.data[o + 3] = Math.round(smoothstep(0.35, 0.8, mask.data[i]) * 255);
  }
  rctx.putImageData(img, 0, 0);

  // Feather: shrink to ~1/5 and scale back up with smoothing (cheap blur).
  const small = createCanvas(Math.max(1, Math.round(width / 5)), Math.max(1, Math.round(height / 5)));
  const sctx = get2d(small);
  sctx.imageSmoothingQuality = 'high';
  sctx.drawImage(raw, 0, 0, small.width, small.height);

  const matte = createCanvas(width, height);
  const mctx = get2d(matte);
  mctx.imageSmoothingEnabled = true;
  mctx.imageSmoothingQuality = 'high';
  // Blend sharp + blurred so the edge stays defined but not jagged.
  mctx.drawImage(raw, 0, 0, width, height);
  mctx.globalAlpha = 0.6;
  mctx.drawImage(small, 0, 0, width, height);
  return matte;
}

/** Draw `img` to fully cover the canvas (center crop). */
function drawCoverImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/**
 * Photo with its background replaced by `scene`. `photo` and `mask` must
 * describe the same image (already cropped to the slot's shape).
 */
export function composeScene(photo: HTMLCanvasElement, mask: PersonMask, scene: HTMLImageElement): HTMLCanvasElement {
  const { width, height } = photo;
  const matte = buildMatte(mask, width, height);

  // Person layer = photo masked by the matte.
  const person = createCanvas(width, height);
  const pctx = get2d(person);
  pctx.drawImage(matte, 0, 0);
  pctx.globalCompositeOperation = 'source-in';
  pctx.drawImage(photo, 0, 0);
  // Gentle cool grade so indoor-lit people sit better in a night scene.
  pctx.globalCompositeOperation = 'source-atop';
  pctx.fillStyle = 'rgba(40, 60, 160, 0.08)';
  pctx.fillRect(0, 0, width, height);

  const out = createCanvas(width, height);
  const ctx = get2d(out);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  drawCoverImage(ctx, scene, width, height);
  // Soft glow from the scene around the silhouette ("light wrap").
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.shadowColor = 'rgba(160, 180, 255, 0.9)';
  ctx.shadowBlur = Math.round(width / 60);
  ctx.drawImage(person, 0, 0);
  ctx.restore();
  ctx.drawImage(person, 0, 0);
  return out;
}
