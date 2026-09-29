/**
 * Person segmentation with MediaPipe Image Segmenter, fully in the browser.
 * The WASM runtime is served from /mediapipe/ (see vite.config.ts) and the
 * model from /models/, so it works offline. Loaded lazily on first use.
 */

import { SEGMENTATION_MODEL } from '../config/app';

/** Per-pixel person probability (0–1), row-major, same size as the input. */
export interface PersonMask {
  width: number;
  height: number;
  data: Float32Array;
}

type Segmenter = import('@mediapipe/tasks-vision').ImageSegmenter;

let segmenterPromise: Promise<Segmenter> | null = null;

function getSegmenter(): Promise<Segmenter> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision');
      const fileset = await FilesetResolver.forVisionTasks('/mediapipe');
      return ImageSegmenter.createFromOptions(fileset, {
        // CPU is slower than GPU but behaves the same on every browser incl. iPad Safari;
        // we only segment 4 still photos per session.
        baseOptions: { modelAssetPath: SEGMENTATION_MODEL, delegate: 'CPU' },
        runningMode: 'IMAGE',
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      });
    })();
    // Allow a retry later if loading failed (e.g. file missing).
    segmenterPromise.catch(() => {
      segmenterPromise = null;
    });
  }
  return segmenterPromise;
}

/** Start downloading/initialising the model in the background. */
export function preloadSegmenter(): void {
  getSegmenter().catch((err) => console.warn('Segmenter preload failed', err));
}

/**
 * Person probability for every pixel of `image`.
 * Handles both single-class (person) and multiclass (0 = background) models.
 */
export async function segmentPerson(image: HTMLCanvasElement): Promise<PersonMask> {
  const segmenter = await getSegmenter();
  const result = segmenter.segment(image);
  try {
    const masks = result.confidenceMasks ?? [];
    if (!masks.length) throw new Error('No confidence mask');
    const first = masks[0];
    const { width, height } = first;
    const src = first.getAsFloat32Array();
    const data = new Float32Array(src.length);
    if (masks.length === 1) {
      data.set(src); // selfie_segmenter: the single mask is "person"
    } else {
      for (let i = 0; i < src.length; i++) data[i] = 1 - src[i]; // multiclass: 1 - background
    }
    return { width, height, data };
  } finally {
    result.close();
  }
}
