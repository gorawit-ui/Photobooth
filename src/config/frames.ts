/**
 * Frame catalogue.
 *
 * Two sources:
 *   - Print templates listed in public/frames/templates.json (1024x1536),
 *     loaded at runtime by loadFrameCatalog(). Each may have its own layout.
 *   - The built-in FRAMES below (1200x1800 design space), used only when
 *     templates.json cannot be loaded.
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
  /** Where the 4 shots go, in shot order. Slots may differ in size and shape. */
  slots: Slot[];
  /** Group key for the frame picker tabs (templates.json `groups`). */
  group?: string;
}

export interface FrameGroup {
  id: string;
  name: string;
}

export interface FrameCatalog {
  frames: FrameConfig[];
  /** Picker tabs, in display order. Empty → no tabs. */
  groups: FrameGroup[];
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

interface TemplatesJson {
  canvas: { width: number; height: number };
  /** Default photo rectangles (the classic 2x2 grid), in shot order. */
  photoSlots: Slot[];
  /** Picker tab names by group key, in display order. */
  groups?: Record<string, string>;
  /** A template may override `photoSlots` with its own layout. */
  templates: { id: string; file: string; name?: string; group?: string; photoSlots?: Slot[] }[];
}

function isSlot(v: unknown): v is Slot {
  const s = v as Slot;
  return !!s && [s.x, s.y, s.width, s.height].every((n) => typeof n === 'number' && n >= 0);
}

/**
 * The print templates from templates.json. If it is missing or malformed,
 * the built-in frames are used instead.
 */
export async function loadFrameCatalog(): Promise<FrameCatalog> {
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
        name: t.name ?? t.id,
        backgroundImage: `/frames/${t.file}`,
        size: { width, height },
        slots,
        slotRadius: 0,
        group: t.group,
      };
    });
    if (!templates.length) throw new Error('No templates');
    const used = new Set(templates.map((t) => t.group));
    const groups = Object.entries(json.groups ?? {})
      .filter(([id]) => used.has(id))
      .map(([id, name]) => ({ id, name }));
    // Tabs only make sense when every frame belongs to one of them.
    const tabbed = groups.length > 1 && templates.every((t) => groups.some((g) => g.id === t.group));
    return { frames: templates, groups: tabbed ? groups : [] };
  } catch (err) {
    console.warn('Could not load print templates, using built-in frames', err);
    return { frames: FRAMES, groups: [] };
  }
}
