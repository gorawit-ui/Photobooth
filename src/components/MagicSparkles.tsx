import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number; // 0..1 remaining
  decay: number;
  hue: number; // 0 = gold, 1 = white-blue
  star: boolean;
  phase: number;
}

const GOLD = [246, 215, 126];
const PALE = [220, 230, 255];

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

/**
 * Drifting gold sparkles over the camera preview (decoration only — not
 * recorded into the photos). Changing `burstKey` fires a burst, used when
 * a shot is taken.
 */
export function MagicSparkles({ burstKey }: { burstKey: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const size = useRef({ w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      size.current = { w: r.width, h: r.height };
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const spawnDrift = (): Particle => {
      const { w, h } = size.current;
      // mostly from the lower half and the side edges, rising gently
      const edge = Math.random() < 0.5;
      return {
        x: edge ? (Math.random() < 0.5 ? Math.random() * w * 0.15 : w - Math.random() * w * 0.15) : Math.random() * w,
        y: h * (0.5 + Math.random() * 0.55),
        vx: (Math.random() - 0.5) * 0.25,
        vy: -(0.25 + Math.random() * 0.55),
        size: 1.6 + Math.random() * 3,
        life: 1,
        decay: 0.003 + Math.random() * 0.004,
        hue: Math.random() < 0.75 ? 0 : 1,
        star: Math.random() < 0.4,
        phase: Math.random() * Math.PI * 2,
      };
    };

    let raf = 0;
    let last = performance.now();
    const target = reduced ? 12 : 55;
    const loop = (now: number) => {
      const dt = Math.min(3, (now - last) / 16.7);
      last = now;
      const { w, h } = size.current;
      const list = particles.current;
      while (list.filter((p) => p.decay < 0.01).length < target) list.push(spawnDrift());
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        if (!reduced) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy -= p.decay > 0.01 ? -0.02 * dt : 0; // burst particles slow down / fall
        }
        p.life -= p.decay * dt;
        p.phase += 0.08 * dt;
        if (p.life <= 0 || p.y < -10 || p.x < -10 || p.x > w + 10) {
          list.splice(i, 1);
          continue;
        }
        const twinkle = 0.65 + 0.35 * Math.sin(p.phase);
        const [r, g, b] = p.hue ? PALE : GOLD;
        const a = Math.min(1, p.life * 1.4) * twinkle;
        ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
        ctx.shadowColor = `rgba(${r},${g},${b},${a})`;
        ctx.shadowBlur = p.size * 4;
        if (p.star) drawStar(ctx, p.x, p.y, p.size * 2.4);
        else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.shadowBlur = 0;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  // Burst of sparkles from the edges when a shot is taken.
  useEffect(() => {
    if (!burstKey) return;
    const { w, h } = size.current;
    for (let i = 0; i < 70; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      particles.current.push({
        x: w / 2 + Math.cos(angle) * w * 0.3,
        y: h / 2 + Math.sin(angle) * h * 0.3,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.5 + Math.random() * 3,
        life: 1,
        decay: 0.02 + Math.random() * 0.02,
        hue: Math.random() < 0.6 ? 0 : 1,
        star: Math.random() < 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }, [burstKey]);

  return <canvas ref={canvasRef} className="magic-sparkles" aria-hidden="true" />;
}
