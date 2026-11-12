/**
 * Gentle automatic brightening for shots taken in dim rooms.
 *
 * Builds one tone curve (the same for R, G and B, so colours keep their hue)
 * from the shot's luminance: a levels stretch to a white point, then a gamma
 * lift if the picture is still dark. Well-exposed shots get no change.
 */

import { get2d } from './canvas';

/** Average brightness aimed for (0–1). */
const TARGET_MEAN = 0.47;
/** Shots at or above this average and with real highlights are left alone. */
const OK_MEAN = 0.4;
/** Limits so noise and blown highlights stay under control. */
const MAX_GAIN = 1.8;
const MIN_GAMMA = 0.6;

function luminanceStats(data: Uint8ClampedArray) {
  const hist = new Uint32Array(256);
  let n = 0;
  // Every 4th pixel is plenty for a histogram.
  for (let i = 0; i < data.length; i += 16) {
    const y = (data[i] * 54 + data[i + 1] * 183 + data[i + 2] * 19) >> 8;
    hist[y]++;
    n++;
  }
  const pct = (p: number) => {
    const goal = n * p;
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= goal) return v / 255;
    }
    return 1;
  };
  let sum = 0;
  for (let v = 0; v < 256; v++) sum += v * hist[v];
  return { mean: sum / (n * 255), black: pct(0.005), white: pct(0.995) };
}

/** Tone curve for this image, or null if it does not need one. */
export function exposureCurve(canvas: HTMLCanvasElement): Uint8ClampedArray | null {
  const ctx = get2d(canvas);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { mean, black, white } = luminanceStats(data);
  if (mean >= OK_MEAN && white >= 0.9) return null;

  const lo = Math.min(black, 0.05);
  const hi = Math.max(white, lo + 1 / MAX_GAIN);
  const stretch = (v: number) => Math.min(1, Math.max(0, (v - lo) / (hi - lo)));

  const stretchedMean = stretch(mean);
  const gamma =
    stretchedMean > 0 && stretchedMean < TARGET_MEAN
      ? Math.max(MIN_GAMMA, Math.log(TARGET_MEAN) / Math.log(stretchedMean))
      : 1;

  const curve = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) curve[v] = Math.round(Math.pow(stretch(v / 255), gamma) * 255);
  return curve;
}

/** Apply a tone curve in place. */
export function applyCurve(canvas: HTMLCanvasElement, curve: Uint8ClampedArray): void {
  const ctx = get2d(canvas);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = curve[d[i]];
    d[i + 1] = curve[d[i + 1]];
    d[i + 2] = curve[d[i + 2]];
  }
  ctx.putImageData(img, 0, 0);
}
