/**
 * Light unsharp-mask (3×3 Laplacian) for shots that had to be enlarged to
 * fill their slot — e.g. the Sony through Imaging Edge Webcam (≈1024×576).
 * Enlarging makes edges soft; this restores some crispness without halos.
 * Works in place on the canvas, pure pixel maths (no ctx.filter needed).
 */
export function sharpen(canvas: HTMLCanvasElement, amount: number): void {
  if (amount <= 0) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  if (w < 3 || h < 3) return;
  const img = ctx.getImageData(0, 0, w, h);
  const src = img.data;
  const out = new Uint8ClampedArray(src);
  const row = w * 4;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * row + x * 4;
      for (let c = 0; c < 3; c++) {
        const k = i + c;
        const lap = 4 * src[k] - src[k - 4] - src[k + 4] - src[k - row] - src[k + row];
        out[k] = src[k] + amount * lap;
      }
    }
  }
  img.data.set(out);
  ctx.putImageData(img, 0, 0);
}

/** How much to sharpen for a given enlargement (1 = none). */
export function sharpenFor(upscale: number): number {
  if (upscale < 1.15) return 0;
  return Math.min(0.45, 0.18 + (upscale - 1.15) * 0.25);
}
