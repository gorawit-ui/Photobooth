import { OUTPUT_HEIGHT, OUTPUT_WIDTH, SLOT_RADIUS } from '../config/app';
import { frameSize, type FrameConfig, type Slot } from '../config/frames';
import { createCanvas, get2d, loadImage } from './canvas';

/** Anything drawImage() accepts with known pixel dimensions. */
export type Drawable = HTMLCanvasElement | HTMLImageElement | ImageBitmap;

export interface FrameAssets {
  /** null → use the code-drawn fallback frame. */
  background: HTMLImageElement | null;
  overlay: HTMLImageElement | null;
}

/** Wait (max 1.5s) for web fonts so text in the fallback frame renders correctly. */
function fontsReady(): Promise<void> {
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  if (!fonts) return Promise.resolve();
  return Promise.race([
    fonts.ready.then(() => undefined),
    new Promise<void>((r) => window.setTimeout(r, 1500)),
  ]);
}

const assetCache = new Map<string, Promise<FrameAssets>>();

/** Load (and cache) a frame's images. Never rejects: missing images become null. */
export function loadFrameAssets(frame: FrameConfig): Promise<FrameAssets> {
  let p = assetCache.get(frame.id);
  if (!p) {
    p = Promise.all([
      loadImage(frame.backgroundImage),
      fontsReady(),
      frame.overlayImage ? loadImage(frame.overlayImage) : Promise.resolve(null),
    ]).then(([background, , overlay]) => {
      if (!background) console.warn(`Frame "${frame.id}": background not found, using fallback`);
      return { background, overlay };
    });
    assetCache.set(frame.id, p);
  }
  return p;
}

function sizeOf(src: Drawable): { w: number; h: number } {
  if (src instanceof HTMLImageElement) return { w: src.naturalWidth, h: src.naturalHeight };
  return { w: src.width, h: src.height };
}

/** Rounded-rect path without relying on ctx.roundRect (Safari < 16). */
function roundedRectPath(ctx: CanvasRenderingContext2D, s: Slot, r: number) {
  const rr = Math.max(0, Math.min(r, s.width / 2, s.height / 2));
  const { x, y, width: w, height: h } = s;
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

/** Center-crop `src` like CSS object-fit: cover into the slot, clipped to rounded corners. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  src: Drawable,
  slot: Slot,
  mirror: boolean,
  radius: number,
) {
  const { w: sw, h: sh } = sizeOf(src);
  if (!sw || !sh) return;
  const targetRatio = slot.width / slot.height;
  let cw = sw;
  let ch = sh;
  if (sw / sh > targetRatio) cw = sh * targetRatio;
  else ch = sw / targetRatio;
  const cx = (sw - cw) / 2;
  const cy = (sh - ch) / 2;

  ctx.save();
  roundedRectPath(ctx, slot, radius);
  ctx.clip();
  if (mirror) {
    // The crop is centered, so mirroring after cropping equals cropping a mirrored image.
    ctx.translate(slot.x + slot.width, slot.y);
    ctx.scale(-1, 1);
    ctx.drawImage(src, cx, cy, cw, ch, 0, 0, slot.width, slot.height);
  } else {
    ctx.drawImage(src, cx, cy, cw, ch, slot.x, slot.y, slot.width, slot.height);
  }
  ctx.restore();
}

/** Empty slot used in frame previews. */
function drawPlaceholder(ctx: CanvasRenderingContext2D, slot: Slot, index: number, radius: number) {
  ctx.save();
  roundedRectPath(ctx, slot, radius);
  const g = ctx.createLinearGradient(slot.x, slot.y, slot.x, slot.y + slot.height);
  g.addColorStop(0, 'rgba(120, 140, 230, 0.35)');
  g.addColorStop(1, 'rgba(40, 50, 120, 0.55)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(240, 201, 110, 0.6)';
  ctx.stroke();
  // Simple head-and-shoulders silhouette
  const cx = slot.x + slot.width / 2;
  const cy = slot.y + slot.height / 2;
  const u = Math.min(slot.width, slot.height) / 6;
  ctx.fillStyle = 'rgba(240, 201, 110, 0.45)';
  ctx.beginPath();
  ctx.arc(cx, cy - u * 0.6, u, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, cy + u * 1.9, u * 1.8, u * 1.2, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 241, 200, 0.85)';
  ctx.font = `600 ${Math.round(u * 0.9)}px Mitr, system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(String(index + 1), slot.x + u * 0.5, slot.y + u * 0.4);
  ctx.restore();
}

/** Deterministic pseudo-random so the fallback frame looks the same every time. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

/** Code-drawn frame: deep-blue gradient, stars and a gold border. In 1200x1800 space. */
export function drawFallbackBackground(ctx: CanvasRenderingContext2D, slots: Slot[] = []) {
  const W = OUTPUT_WIDTH;
  const H = OUTPUT_HEIGHT;
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0d1850');
  bg.addColorStop(0.55, '#081038');
  bg.addColorStop(1, '#040720');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W / 2, H * 0.86, 20, W / 2, H * 0.86, 520);
  glow.addColorStop(0, 'rgba(90, 110, 230, 0.35)');
  glow.addColorStop(1, 'rgba(90, 110, 230, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const rnd = seeded(42);
  for (let i = 0; i < 140; i++) {
    ctx.fillStyle = `rgba(255, 240, 200, ${0.25 + rnd() * 0.6})`;
    ctx.beginPath();
    ctx.arc(rnd() * W, rnd() * H, 0.8 + rnd() * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#f3d27a';
  for (let i = 0; i < 12; i++) drawSparkle(ctx, 60 + rnd() * (W - 120), 1400 + rnd() * 340, 8 + rnd() * 14);

  const gold = ctx.createLinearGradient(0, 0, W, H);
  gold.addColorStop(0, '#fff0b3');
  gold.addColorStop(0.5, '#e2b24a');
  gold.addColorStop(1, '#a8761f');
  ctx.strokeStyle = gold;
  ctx.lineWidth = 10;
  ctx.strokeRect(18, 18, W - 36, H - 36);
  ctx.lineWidth = 3;
  ctx.strokeRect(34, 34, W - 68, H - 68);

  // Gold edge around each photo slot
  ctx.lineWidth = 6;
  slots.forEach((s) => {
    roundedRectPath(ctx, { x: s.x - 6, y: s.y - 6, width: s.width + 12, height: s.height + 12 }, SLOT_RADIUS + 6);
    ctx.stroke();
  });

  ctx.fillStyle = gold;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 84px "Cinzel Decorative", Georgia, serif';
  ctx.fillText('Magical Night', W / 2, 1530);
  ctx.font = '500 40px Mitr, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255, 236, 180, 0.85)';
  ctx.fillText('✦  ค่ำคืนแห่งเวทมนตร์  ✦', W / 2, 1625);
}

function drawBackground(ctx: CanvasRenderingContext2D, frame: FrameConfig, assets: FrameAssets) {
  const { width, height } = frameSize(frame);
  if (assets.background) {
    ctx.drawImage(assets.background, 0, 0, width, height);
    return;
  }
  // The fallback is drawn in 1200x1800 space; scale it to this frame's size.
  const sx = width / OUTPUT_WIDTH;
  const sy = height / OUTPUT_HEIGHT;
  ctx.save();
  ctx.scale(sx, sy);
  drawFallbackBackground(
    ctx,
    frame.slots.map((s) => ({ x: s.x / sx, y: s.y / sy, width: s.width / sx, height: s.height / sy })),
  );
  ctx.restore();
}

function drawOverlay(ctx: CanvasRenderingContext2D, frame: FrameConfig, assets: FrameAssets) {
  const { width, height } = frameSize(frame);
  if (assets.overlay) ctx.drawImage(assets.overlay, 0, 0, width, height);
}

/** Scale the frame's pixel space to the target canvas size. */
function prepare(canvas: HTMLCanvasElement, frame: FrameConfig) {
  const { width, height } = frameSize(frame);
  const ctx = get2d(canvas);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
  return ctx;
}

/**
 * Compose the final image: background → shots (center-crop cover, clipped to
 * each slot) → overlay. Output defaults to the frame's native size.
 * `shots[i]` missing draws a placeholder (frame previews) unless
 * `placeholders: false`, which leaves that slot as the bare artwork.
 */
export function composeFrame(
  frame: FrameConfig,
  assets: FrameAssets,
  shots: (Drawable | null)[],
  options: { width?: number; height?: number; mirror: boolean; placeholders?: boolean },
): HTMLCanvasElement {
  const size = frameSize(frame);
  const radius = frame.slotRadius ?? SLOT_RADIUS;
  const canvas = createCanvas(options.width ?? size.width, options.height ?? size.height);
  const ctx = prepare(canvas, frame);
  drawBackground(ctx, frame, assets);
  frame.slots.forEach((slot, i) => {
    const shot = shots[i];
    if (shot) drawCover(ctx, shot, slot, options.mirror, radius);
    else if (options.placeholders !== false) drawPlaceholder(ctx, slot, i, radius);
  });
  drawOverlay(ctx, frame, assets);
  return canvas;
}

/** Bounding box of all slots — the default area for a single GIF shot. */
export function gifSlotOf(frame: FrameConfig): Slot {
  if (frame.gifSlot) return frame.gifSlot;
  const x = Math.min(...frame.slots.map((s) => s.x));
  const y = Math.min(...frame.slots.map((s) => s.y));
  const r = Math.max(...frame.slots.map((s) => s.x + s.width));
  const b = Math.max(...frame.slots.map((s) => s.y + s.height));
  return { x, y, width: r - x, height: b - y };
}

/** One GIF frame: the frame artwork with a single shot filling the GIF slot. */
export function composeSingleShot(
  frame: FrameConfig,
  assets: FrameAssets,
  shot: Drawable,
  options: { width: number; height: number; mirror: boolean },
): HTMLCanvasElement {
  const canvas = createCanvas(options.width, options.height);
  const ctx = prepare(canvas, frame);
  drawBackground(ctx, frame, assets);
  drawCover(ctx, shot, gifSlotOf(frame), options.mirror, frame.slotRadius ?? SLOT_RADIUS);
  drawOverlay(ctx, frame, assets);
  return canvas;
}
