/**
 * Ambient motion for the "Enchanted Station" landing background
 * (ported from the designer handoff, behaviour unchanged):
 *   - gold particles on a canvas, 30 fps cap, DPR capped at 1.5,
 *     58 particles on desktop / 22 below 700 px, dimmed over the text area
 *   - gentle pointer parallax (±4 px / ±2.5 px) on fine-pointer desktops
 *   - pauses when the tab is hidden; OS "reduce motion" always wins
 * CSS animations (mist, candles, ribbon) pause via root[data-motion].
 */

export interface MotionController {
  setPaused: (paused: boolean) => boolean;
  isPaused: () => boolean;
  destroy: () => void;
}

interface Particle {
  x: number;
  y: number;
  r: number;
  speed: number;
  phase: number;
  drift: number;
}

const NOOP: MotionController = { setPaused: () => true, isPaused: () => true, destroy: () => {} };

export function initMagicBackground(root: HTMLElement, options: { paused?: boolean } = {}): MotionController {
  const canvas = root.querySelector('canvas');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return NOOP;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)');
  let wanted = !!options.paused;
  let paused = wanted || reduce.matches;
  let disposed = false;
  let raf = 0;
  let last = 0;
  let w = 0;
  let h = 0;
  let particles: Particle[] = [];
  let seed = 240612;
  // Phones and upright tablets use the portrait artwork (text on top).
  const narrow = () => w <= 700 || h > w;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  function draw(t: number, dt: number) {
    ctx!.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.y -= (p.speed * dt) / Math.max(h, 1);
      if (p.y < -0.04) p.y = 1.05;
      const x = p.x * w + Math.sin(t * 0.00017 + p.phase) * p.drift;
      const y = p.y * h;
      let opacity = 0.12 + 0.38 * (0.5 + 0.5 * Math.sin(t * 0.0008 + p.phase));
      // Keep the text-safe zone calm.
      if (!narrow() && p.x < 0.53 && p.y < 0.77) opacity *= 0.22;
      if (narrow() && p.y < 0.52) opacity *= 0.18;
      ctx!.beginPath();
      ctx!.fillStyle = `rgba(250,222,165,${opacity})`;
      ctx!.shadowColor = '#e7c988';
      ctx!.shadowBlur = p.r > 1.2 ? 6 : 1;
      ctx!.arc(x, y, p.r, 0, Math.PI * 2);
      ctx!.fill();
    }
    ctx!.shadowBlur = 0;
  }

  function resize() {
    const r = root.getBoundingClientRect();
    w = r.width;
    h = r.height;
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas!.width = Math.round(w * ratio);
    canvas!.height = Math.round(h * ratio);
    ctx!.setTransform(ratio, 0, 0, ratio, 0, 0);
    seed = 240612;
    particles = [];
    const count = narrow() ? 22 : 58;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: random(),
        y: random(),
        r: 0.4 + random() * 1.15,
        speed: 4 + random() * 9,
        phase: random() * Math.PI * 2,
        drift: 2 + random() * 12,
      });
    }
    if (reduce.matches) ctx!.clearRect(0, 0, w, h);
    else draw(performance.now(), 0);
  }

  function loop(t: number) {
    if (disposed) return;
    raf = 0;
    if (paused || document.hidden) return;
    if (!last || t - last >= 1000 / 30) {
      const dt = last ? Math.min((t - last) / 1000, 0.06) : 0;
      last = t;
      draw(t, dt);
    }
    raf = requestAnimationFrame(loop);
  }

  function sync() {
    root.dataset.motion = paused ? 'paused' : 'running';
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    if (paused) resetParallax();
    if (!paused && !document.hidden && !disposed) raf = requestAnimationFrame(loop);
    else if (reduce.matches) ctx!.clearRect(0, 0, w, h);
  }

  const onVisibility = () => {
    root.dataset.hidden = String(document.hidden);
    sync();
  };
  const onPreference = () => {
    paused = wanted || reduce.matches;
    sync();
  };
  function onPointer(e: PointerEvent) {
    if (paused || !finePointer.matches || narrow()) return;
    const r = root.getBoundingClientRect();
    root.style.setProperty('--px', `${((e.clientX - r.left) / w - 0.5) * -8}px`);
    root.style.setProperty('--py', `${((e.clientY - r.top) / h - 0.5) * -5}px`);
  }
  function resetParallax() {
    root.style.setProperty('--px', '0px');
    root.style.setProperty('--py', '0px');
  }

  const observer = new ResizeObserver(resize);
  observer.observe(root);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('blur', resetParallax);
  reduce.addEventListener?.('change', onPreference);
  resize();
  sync();

  return {
    setPaused(value: boolean) {
      wanted = value;
      paused = wanted || reduce.matches;
      sync();
      return paused;
    },
    isPaused: () => paused,
    destroy() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('blur', resetParallax);
      reduce.removeEventListener?.('change', onPreference);
    },
  };
}

/** True when the OS asks for reduced motion (the background then stays still). */
export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
