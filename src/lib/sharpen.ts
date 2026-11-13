/**
 * Detail for shots taken from a video stream (webcams, Sony through Imaging
 * Edge Webcam): video frames are soft from compression and, for low-res
 * cameras, from being enlarged to fill the slot. A gentle unsharp mask
 * (blur → add back the difference) restores edge crispness on the one real
 * frame — no frame stacking, no AI, nothing added that the camera did not see.
 * A threshold leaves flat areas (skin, walls) alone so noise is not boosted.
 * Phone stills are already sharpened by the phone and are left untouched.
 */

const fromVideo = new WeakSet<HTMLCanvasElement>();

/** Mark a shot as a video frame (see captureFrame). */
export function markVideoFrame(canvas: HTMLCanvasElement): HTMLCanvasElement {
  fromVideo.add(canvas);
  return canvas;
}
export const isVideoFrame = (src: unknown) => src instanceof HTMLCanvasElement && fromVideo.has(src);

/** Box blur of one channel set, radius r, horizontal then vertical (in place on `buf`). */
function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const span = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += src[row + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc / span;
      acc += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / span;
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

/**
 * Unsharp mask on luminance only (no colour fringes), in place.
 * amount ≈ 0.3–1.0, radius in px, threshold in 0–255 luma levels.
 */
export function sharpen(canvas: HTMLCanvasElement, amount: number, radius = 1, threshold = 3): void {
  if (amount <= 0) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  if (w < 4 || h < 4) return;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const n = w * h;
  const luma = new Float32Array(n);
  for (let i = 0, p = 0; i < n; i++, p += 4) luma[i] = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2];
  // Two box passes ≈ a small gaussian.
  const r = Math.max(1, Math.round(radius));
  const blur = boxBlur(boxBlur(luma, w, h, r), w, h, r);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const diff = luma[i] - blur[i];
    if (Math.abs(diff) < threshold) continue;
    const add = amount * diff;
    d[p] += add;
    d[p + 1] += add;
    d[p + 2] += add;
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Strength for a video frame enlarged `upscale`× into its slot.
 * Returns [amount, radius]. Bigger enlargement → wider, stronger.
 */
export function sharpenFor(upscale: number): [number, number] {
  if (upscale <= 1.15) return [0.45, 1];
  if (upscale <= 2) return [0.6 + (upscale - 1.15) * 0.25, 1];
  return [Math.min(0.9, 0.8 + (upscale - 2) * 0.1), 2];
}
