/**
 * Locomotive smoke for the landing background: soft lavender puffs that leave
 * the chimney, drift up and to the right, swell and fade into the smoke that
 * is already painted in the artwork.
 *
 * Puffs live in the artwork's own pixel space (offsets from the chimney), and
 * are mapped to the screen each frame from the <img>'s real box, object-fit
 * cover and object-position — so the smoke stays on the chimney for any
 * screen size, crop or parallax offset.
 */

interface Anchor {
  /** Chimney top in artwork pixels. */
  x: number;
  y: number;
  /** Chimney mouth width in artwork pixels (sets the puff size). */
  mouth: number;
}

/** Chimney of the painted locomotive, per artwork (measured on the images). */
const ANCHORS: { match: RegExp; width: number; height: number; anchor: Anchor }[] = [
  { match: /mobile/, width: 941, height: 1672, anchor: { x: 680, y: 1251, mouth: 18 } },
  { match: /desktop/, width: 1672, height: 941, anchor: { x: 1305, y: 472, mouth: 22 } },
];

interface Puff {
  x: number; // artwork px from chimney
  y: number;
  vx: number;
  vy: number;
  r0: number;
  r1: number;
  age: number;
  life: number;
  spin: number;
  rot: number;
  peak: number;
}

function makeSprite(): HTMLCanvasElement {
  // One soft, slightly lumpy puff, tinted like the painted smoke.
  const s = 128;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const g = c.getContext('2d')!;
  const blob = (x: number, y: number, r: number, a: number) => {
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(232, 226, 242, ${a})`);
    grd.addColorStop(0.45, `rgba(214, 206, 232, ${a * 0.55})`);
    grd.addColorStop(1, 'rgba(200, 192, 222, 0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  };
  blob(64, 64, 60, 0.9);
  blob(46, 54, 34, 0.5);
  blob(82, 50, 30, 0.45);
  blob(70, 82, 32, 0.4);
  return c;
}

function percent(v: string | undefined, fallback: number): number {
  const n = v ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n / 100 : fallback;
}

export class SmokeLayer {
  private ctx: CanvasRenderingContext2D;
  private sprite = makeSprite();
  private puffs: Puff[] = [];
  private spawnIn = 0;
  private burst = 0;
  private w = 0;
  private h = 0;
  private seed = 7331;

  constructor(
    private canvas: HTMLCanvasElement,
    private img: HTMLImageElement,
  ) {
    this.ctx = canvas.getContext('2d')!;
  }

  private random() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  resize(w: number, h: number, ratio: number) {
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * ratio);
    this.canvas.height = Math.round(h * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  /** Where the chimney is on screen and how big one artwork pixel is. */
  private mapping() {
    const src = this.img.currentSrc || this.img.src;
    const art = ANCHORS.find((a) => a.match.test(src));
    if (!art || !this.img.complete) return null;
    const root = this.canvas.getBoundingClientRect();
    const r = this.img.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const scale = Math.max(r.width / art.width, r.height / art.height);
    const [px, py] = getComputedStyle(this.img).objectPosition.split(' ');
    const ox = (r.width - art.width * scale) * percent(px, 0.5);
    const oy = (r.height - art.height * scale) * percent(py, 0.5);
    return {
      x: r.left - root.left + ox + art.anchor.x * scale,
      y: r.top - root.top + oy + art.anchor.y * scale,
      scale,
      mouth: art.anchor.mouth,
    };
  }

  private spawn(mouth: number) {
    const rand = () => this.random();
    this.puffs.push({
      x: (rand() - 0.5) * mouth * 0.3,
      y: -mouth * 0.2,
      vx: mouth * (0.35 + rand() * 0.45), // drift right with the painted plume
      vy: -mouth * (1.1 + rand() * 0.5),
      r0: mouth * (0.45 + rand() * 0.2),
      r1: mouth * (2.6 + rand() * 1.6),
      age: 0,
      life: 5.5 + rand() * 2.5,
      spin: (rand() - 0.5) * 0.35,
      rot: rand() * Math.PI * 2,
      peak: 0.42 + rand() * 0.22,
    });
  }

  /** Advance the simulation by dt seconds and draw. */
  step(dt: number) {
    const m = this.mapping();
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    if (!m) return;

    // A locomotive "chuff": two quick puffs, then a pause.
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      this.spawn(m.mouth);
      this.burst++;
      this.spawnIn = this.burst % 2 ? 0.28 : 0.9 + this.random() * 0.5;
    }

    this.puffs = this.puffs.filter((p) => (p.age += dt) < p.life);
    for (const p of this.puffs) {
      const t = p.age / p.life;
      // rise slows as the puff cools; sideways drift keeps going
      p.vy *= 1 - 0.35 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      const r = p.r0 + (p.r1 - p.r0) * (1 - Math.pow(1 - t, 2.2));
      const alpha = p.peak * Math.min(1, t / 0.12) * Math.pow(1 - t, 1.6);
      const size = r * 2 * m.scale;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(m.x + p.x * m.scale, m.y + p.y * m.scale);
      ctx.rotate(p.rot);
      ctx.drawImage(this.sprite, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
  }

  /** Pre-fill the plume so it does not start from nothing. */
  warmUp(seconds: number) {
    const m = this.mapping();
    if (!m) return;
    for (let t = 0; t < seconds; t += 1 / 30) this.step(1 / 30);
  }

  clear() {
    this.ctx.clearRect(0, 0, this.w, this.h);
  }
}
