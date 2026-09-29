/**
 * Colour filters for the photos (applied to the photos only, never to the
 * frame). Pure per-pixel maths on ImageData, so they look identical in
 * Chrome, Edge and Safari (ctx.filter is not available in older Safari).
 */

import { createCanvas, get2d } from './canvas';

export type FilterId = 'none' | 'gold' | 'night' | 'bw' | 'mood' | 'sepia';

interface FilterParams {
  saturation?: number; // 1 = unchanged, 0 = greyscale
  contrast?: number; // 1 = unchanged
  brightness?: number; // multiplier
  tint?: [number, number, number]; // per-channel multiplier
  sepia?: number; // 0–1 blend towards sepia
  fade?: number; // 0–1 lifts the blacks (matte / faded look)
}

export interface PhotoFilter {
  id: FilterId;
  name: string;
  /** CSS gradient for the filter chip swatch. */
  swatch: string;
  params: FilterParams | null;
}

export const FILTERS: PhotoFilter[] = [
  { id: 'none', name: 'ปกติ', swatch: 'linear-gradient(135deg,#f2c9a0,#6aa0e0)', params: null },
  {
    id: 'gold',
    name: 'ทองอุ่น',
    swatch: 'linear-gradient(135deg,#ffe29a,#c9822b)',
    params: { saturation: 1.08, contrast: 1.05, tint: [1.08, 1.0, 0.86], brightness: 1.02 },
  },
  {
    id: 'night',
    name: 'ค่ำคืนน้ำเงิน',
    swatch: 'linear-gradient(135deg,#7f9cff,#1b2a78)',
    params: { saturation: 0.92, contrast: 1.08, tint: [0.9, 0.97, 1.14], brightness: 0.97 },
  },
  {
    id: 'bw',
    name: 'ขาวดำ',
    swatch: 'linear-gradient(135deg,#ffffff,#1a1a1a)',
    params: { saturation: 0, contrast: 1.18 },
  },
  {
    id: 'mood',
    name: 'เทามูดี้',
    swatch: 'linear-gradient(135deg,#b8b8b8,#4a4a4a)',
    params: { saturation: 0, contrast: 0.82, fade: 0.1, brightness: 0.97 },
  },
  {
    id: 'sepia',
    name: 'ฟิล์มซีเปีย',
    swatch: 'linear-gradient(135deg,#f3dcb0,#7a5230)',
    params: { sepia: 0.85, contrast: 0.95, fade: 0.05 },
  },
];

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

function applyParams(data: Uint8ClampedArray, p: FilterParams) {
  const sat = p.saturation ?? 1;
  const con = p.contrast ?? 1;
  const bri = p.brightness ?? 1;
  const [tr, tg, tb] = p.tint ?? [1, 1, 1];
  const sep = p.sepia ?? 0;
  const fade = (p.fade ?? 0) * 255;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    // saturation around luma
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = l + (r - l) * sat;
    g = l + (g - l) * sat;
    b = l + (b - l) * sat;
    if (sep > 0) {
      const sr = 0.393 * r + 0.769 * g + 0.189 * b;
      const sg = 0.349 * r + 0.686 * g + 0.168 * b;
      const sb = 0.272 * r + 0.534 * g + 0.131 * b;
      r += (sr - r) * sep;
      g += (sg - g) * sep;
      b += (sb - b) * sep;
    }
    r = ((r - 128) * con + 128) * bri * tr;
    g = ((g - 128) * con + 128) * bri * tg;
    b = ((b - 128) * con + 128) * bri * tb;
    if (fade > 0) {
      r = fade + r * (1 - fade / 255);
      g = fade + g * (1 - fade / 255);
      b = fade + b * (1 - fade / 255);
    }
    data[i] = clamp(r);
    data[i + 1] = clamp(g);
    data[i + 2] = clamp(b);
  }
}

/** A filtered copy of `src` ('none' returns `src` itself). */
export function applyFilter(src: HTMLCanvasElement, id: FilterId): HTMLCanvasElement {
  const filter = FILTERS.find((f) => f.id === id);
  if (!filter?.params) return src;
  const out = createCanvas(src.width, src.height);
  const ctx = get2d(out, { willReadFrequently: true });
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, out.width, out.height);
  applyParams(img.data, filter.params);
  ctx.putImageData(img, 0, 0);
  return out;
}
