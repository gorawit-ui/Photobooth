/**
 * Frame catalogue.
 *
 * Two sources:
 *   - Print templates listed in public/frames/templates.json (1024x1536),
 *     loaded at runtime by loadFrameCatalog(). Their slots are the safe-inset
 *     photo rectangles from that JSON.
 *   - The built-in FRAMES below (1200x1800 design space).
 *
 * Coordinates are in the frame's own pixel space (`size`, default 1200x1800).
 */

import { OUTPUT_HEIGHT, OUTPUT_WIDTH } from './app';

export interface Slot {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FrameConfig {
  id: string;
  name: string;
  /** Drawn first, stretched to the full frame size. Path relative to /public. */
  backgroundImage: string;
  /** Pixel size of the artwork, slots and exported JPG. Default 1200x1800. */
  size?: { width: number; height: number };
  /** Photo corner radius in frame pixels. Default SLOT_RADIUS. */
  slotRadius?: number;
  /** Optional transparent PNG drawn on top of everything. */
  overlayImage?: string;
  /** Where the 4 shots go, in shot order. */
  slots: Slot[];
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

export function frameSize(frame: FrameConfig): { width: number; height: number } {
  return frame.size ?? { width: OUTPUT_WIDTH, height: OUTPUT_HEIGHT };
}

// ---------------------------------------------------------------------------
// Print templates (public/frames/templates.json)
// ---------------------------------------------------------------------------

const TEMPLATES_URL = '/frames/templates.json';

/** Display names for template ids; unknown ids fall back to the id. */
const TEMPLATE_NAMES: Record<string, string> = {
  'castle-classic': 'ปราสาทคลาสสิก',
  'enchanted-garden': 'สวนต้องมนตร์',
  'moonlit-castle': 'ปราสาทใต้แสงจันทร์',
};

interface TemplatesJson {
  canvas: { width: number; height: number };
  /** Safe-inset photo rectangles: top-left, top-right, bottom-left, bottom-right. */
  photoSlots: Slot[];
  /** A template may override `photoSlots` if its border differs slightly. */
  templates: { id: string; file: string; name?: string; photoSlots?: Slot[] }[];
}

function isSlot(v: unknown): v is Slot {
  const s = v as Slot;
  return !!s && [s.x, s.y, s.width, s.height].every((n) => typeof n === 'number' && n >= 0);
}

/**
 * Print templates first, then the built-in frames. If templates.json is
 * missing or malformed, only the built-in frames are returned.
 */
export async function loadFrameCatalog(): Promise<FrameConfig[]> {
  try {
    const res = await fetch(TEMPLATES_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as TemplatesJson;
    const { width, height } = json.canvas;
    const templates = json.templates.map((t): FrameConfig => {
      const slots = t.photoSlots ?? json.photoSlots;
      if (slots.length !== 4 || !slots.every(isSlot)) throw new Error(`Bad slots for ${t.id}`);
      return {
        id: t.id,
        name: t.name ?? TEMPLATE_NAMES[t.id] ?? t.id,
        backgroundImage: `/frames/${t.file}`,
        size: { width, height },
        slots,
        slotRadius: 0,
      };
    });
    return [...templates, ...FRAMES];
  } catch (err) {
    console.warn('Could not load print templates, using built-in frames only', err);
    return FRAMES;
  }
}
