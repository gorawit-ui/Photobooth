import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { GIF_FRAME_DELAY_MS, GIF_HEIGHT, GIF_WIDTH } from '../config/app';
import type { FrameConfig } from '../config/frames';
import { get2d, releaseCanvas } from './canvas';
import { composeSingleShot, type Drawable, type FrameAssets } from './compose';

const nextTick = () => new Promise<void>((r) => window.setTimeout(r, 0));

/**
 * Animated GIF (600x900): one frame per shot, each inside the frame artwork,
 * GIF_FRAME_DELAY_MS per frame, looping forever.
 */
export async function createGif(
  frame: FrameConfig,
  assets: FrameAssets,
  shots: Drawable[],
  mirror: boolean,
): Promise<Blob> {
  const gif = GIFEncoder();
  for (const shot of shots) {
    const canvas = composeSingleShot(frame, assets, shot, {
      width: GIF_WIDTH,
      height: GIF_HEIGHT,
      mirror,
    });
    const { data } = get2d(canvas).getImageData(0, 0, GIF_WIDTH, GIF_HEIGHT);
    releaseCanvas(canvas);
    // Per-frame palette keeps skin tones and the gold artwork looking good.
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, GIF_WIDTH, GIF_HEIGHT, {
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
