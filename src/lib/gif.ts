import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { GIF_FRAME_DELAY_MS, GIF_WIDTH } from '../config/app';
import { get2d, releaseCanvas } from './canvas';
import { composeShotOnly, type Drawable } from './compose';

const nextTick = () => new Promise<void>((r) => window.setTimeout(r, 0));

/**
 * Animated GIF of the raw shots only (no frame): one GIF frame per shot,
 * GIF_FRAME_DELAY_MS each, looping forever. Each shot is center-cropped to
 * `aspect` (width / height) — the same crop as the camera preview — at
 * GIF_WIDTH pixels wide.
 */
export async function createGif(shots: Drawable[], aspect: number, mirror: boolean): Promise<Blob> {
  const width = GIF_WIDTH;
  const height = Math.round(GIF_WIDTH / aspect);
  const gif = GIFEncoder();
  for (const shot of shots) {
    const canvas = composeShotOnly(shot, { width, height, mirror });
    const { data } = get2d(canvas).getImageData(0, 0, width, height);
    releaseCanvas(canvas);
    // Per-frame palette keeps skin tones looking good.
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, width, height, {
      palette,
      delay: GIF_FRAME_DELAY_MS,
      repeat: 0, // 0 = loop forever
    });
    // Let the loading animation breathe between frames.
    await nextTick();
  }
  gif.finish();
  return new Blob([gif.bytes() as Uint8Array<ArrayBuffer>], { type: 'image/gif' });
}
