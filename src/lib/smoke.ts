/**
 * Locomotive smoke for the landing background: a steady stream of lavender
 * puffs (a stronger "chuff" every few) that rise high, are blown to the right,
 * swell and fade into the painted plume — with gold embers and little magic
 * stars carried up in it.
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

/** Gold ember / magic spark carried up by the plume. */
interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  phase: number;
  star: boolean;
}

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
    grd.addColorStop(0, `rgba(246, 242, 252, ${a})`);
    grd.addColorStop(0.45, `rgba(222, 214, 238, ${a * 0.62})`);
    grd.addColorStop(1, 'rgba(200, 192, 222, 0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  };
  blob(64, 64, 60, 1);
  blob(46, 54, 36, 0.7);
  blob(82, 50, 32, 0.65);
  blob(70, 82, 34, 0.6);
  blob(58, 70, 22, 0.5);
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
  private sparks: Spark[] = [];
  private spawnIn = 0;
  private sparkIn = 0;
  private beat = 0;
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

  private spawn(mouth: number, strong: boolean) {
    const rand = () => this.random();
    this.puffs.push({
      x: (rand() - 0.5) * mouth * 0.3,
      y: -mouth * 0.2,
      vx: mouth * (0.7 + rand() * 0.6), // carried right, as if the train is moving
      vy: -mouth * (strong ? 2.6 : 1.9) * (0.9 + rand() * 0.25), // rises high
      r0: mouth * (0.5 + rand() * 0.2),
      r1: mouth * (3.2 + rand() * 2.2),
      age: 0,
      life: 6.5 + rand() * 2.5,
      spin: (rand() - 0.5) * 0.4,
      rot: rand() * Math.PI * 2,
      peak: (strong ? 0.82 : 0.62) + rand() * 0.15,
    });
  }

  private spawnSpark(mouth: number) {
    const rand = () => this.random();
    this.sparks.push({
      x: (rand() - 0.5) * mouth * 0.5,
      y: -mouth * 0.3,
      vx: mouth * (0.6 + rand() * 1.4),
      vy: -mouth * (2.6 + rand() * 2.2),
      age: 0,
      life: 1.4 + rand() * 1.8,
      size: 0.6 + rand() * 1.1,
      phase: rand() * Math.PI * 2,
      star: rand() < 0.28, // some are little four-point stars: magic, not just embers
    });
  }

  /** Advance the simulation by dt seconds and draw. */
  step(dt: number) {
    const m = this.mapping();
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    if (!m) return;

    // A running locomotive: a steady stream with a stronger "chuff" every 4th puff.
    this.spawnIn -= dt;
    if (this.spawnIn <= 0) {
      this.beat++;
      this.spawn(m.mouth, this.beat % 4 === 0);
      this.spawnIn = 0.17 + this.random() * 0.08;
    }
    this.sparkIn -= dt;
    if (this.sparkIn <= 0) {
      this.spawnSpark(m.mouth);
      this.sparkIn = 0.1 + this.random() * 0.18;
    }

    // warm glow at the chimney mouth
    const glow = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.mouth * 2.2 * m.scale);
    glow.addColorStop(0, 'rgba(255, 214, 140, 0.35)');
    glow.addColorStop(1, 'rgba(255, 214, 140, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(m.x - m.mouth * 3 * m.scale, m.y - m.mouth * 3 * m.scale, m.mouth * 6 * m.scale, m.mouth * 6 * m.scale);

    this.puffs = this.puffs.filter((p) => (p.age += dt) < p.life);
    for (const p of this.puffs) {
      const t = p.age / p.life;
      // rise slows as the puff cools; the wind pushes it further right as it climbs
      p.vy *= 1 - 0.22 * dt;
      p.vx += m.mouth * 0.25 * dt;
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

    // Sparks glow on top of the smoke (additive light).
    this.sparks = this.sparks.filter((p) => (p.age += dt) < p.life);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.sparks) {
      const t = p.age / p.life;
      p.vy *= 1 - 0.5 * dt;
      p.vx += m.mouth * 0.35 * dt;
      p.x += p.vx * dt + Math.sin(p.age * 6 + p.phase) * m.mouth * 0.04;
      p.y += p.vy * dt;
      const flicker = 0.65 + 0.35 * Math.sin(p.age * 18 + p.phase);
      const a = Math.min(1, t / 0.08) * (1 - t) * flicker;
      const x = m.x + p.x * m.scale;
      const y = m.y + p.y * m.scale;
      const r = Math.max(1, p.size * m.scale * 2.2);
      const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
      halo.addColorStop(0, `rgba(255, 226, 150, ${0.55 * a})`);
      halo.addColorStop(1, 'rgba(255, 190, 90, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
      ctx.fillStyle = `rgba(255, 246, 214, ${a})`;
      if (p.star) {
        const k = r * 2.4;
        ctx.beginPath();
        ctx.moveTo(x, y - k);
        ctx.quadraticCurveTo(x, y, x + k, y);
        ctx.quadraticCurveTo(x, y, x, y + k);
        ctx.quadraticCurveTo(x, y, x - k, y);
        ctx.quadraticCurveTo(x, y, x, y - k);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(x, y, r * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
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
