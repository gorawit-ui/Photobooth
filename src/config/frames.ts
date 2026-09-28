/**
 * Frame catalogue.
 *
 * To add a new frame:
 *   1. Put the artwork in public/frames/ (1200x1800 PNG recommended).
 *   2. Add an entry to FRAMES below.
 *
 * All coordinates are in the 1200x1800 output space.
 */

export interface Slot {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FrameConfig {
  id: string;
  name: string;
  /** Drawn first, stretched to 1200x1800. Path relative to /public. */
  backgroundImage: string;
  /** Optional transparent PNG drawn on top of everything. */
  overlayImage?: string;
  /** Where the 4 shots go, in shot order. */
  slots: Slot[];
  /**
   * Optional area used by the animated GIF, where each GIF frame shows one
   * shot at a time. Defaults to the bounding box of all slots.
   */
  gifSlot?: Slot;
}

export const DEFAULT_SLOTS: Slot[] = [
  { x: 50, y: 60, width: 530, height: 640 },
  { x: 620, y: 60, width: 530, height: 640 },
  { x: 50, y: 740, width: 530, height: 640 },
  { x: 620, y: 740, width: 530, height: 640 },
];

export const FRAMES: FrameConfig[] = [
  {
    id: 'starry-night',
    name: 'ค่ำคืนแห่งดวงดาว',
    backgroundImage: '/frames/frame-1.png',
    slots: DEFAULT_SLOTS,
  },
  {
    id: 'golden-moon',
    name: 'จันทร์เสี้ยวสีทอง',
    backgroundImage: '/frames/frame-2.png',
    overlayImage: '/frames/frame-2-overlay.png',
    slots: DEFAULT_SLOTS,
  },
  {
    id: 'crystal-spell',
    name: 'คาถาคริสตัล',
    backgroundImage: '/frames/frame-3.png',
    slots: DEFAULT_SLOTS,
  },
];
