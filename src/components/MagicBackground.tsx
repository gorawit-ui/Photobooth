import { useEffect, useId, useRef, type CSSProperties } from 'react';
import { initMagicBackground, type MotionController } from '../lib/magicBackground';
import './MagicBackground.css';

const ASSET_BASE = '/backgrounds/tdfb';

const CANDLES = [
  { x: '68%', y: '17%', s: 0.65, d: '9s', delay: '-3s' },
  { x: '74%', y: '11%', s: 0.5, d: '12s', delay: '-6s' },
  { x: '81%', y: '26%', s: 0.75, d: '10s', delay: '-2s' },
  { x: '92%', y: '39%', s: 0.65, d: '13s', delay: '-7s' },
];

const TRAIL = 'M-80 774 C210 980 490 708 850 793 S1330 700 1700 747';

/**
 * Painted academy + locomotive with mist, candles, a gold ribbon and
 * particles. Decorative only — mount it on the landing screen alone so it
 * costs nothing while the camera runs.
 */
export function MagicBackground({ paused }: { paused: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const engine = useRef<MotionController | null>(null);
  const initialPaused = useRef(paused);
  const ribbonId = `tdfb-ribbon-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  useEffect(() => {
    if (!root.current) return;
    engine.current = initMagicBackground(root.current, { paused: initialPaused.current });
    return () => {
      engine.current?.destroy();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    engine.current?.setPaused(paused);
  }, [paused]);

  return (
    <div ref={root} className="tdfb-bg" aria-hidden="true">
      <picture className="tdfb-bg__art">
        <source media="(max-width: 700px), (orientation: portrait)" srcSet={`${ASSET_BASE}/enchanted-station-mobile.webp`} />
        <img src={`${ASSET_BASE}/enchanted-station-desktop.webp`} alt="" draggable={false} />
      </picture>
      <div className="tdfb-bg__glow" />
      <div className="tdfb-bg__mist tdfb-bg__mist--far" />
      <div className="tdfb-bg__mist" />
      {CANDLES.map((c, i) => (
        <div
          key={i}
          className="tdfb-bg__candle"
          style={{ '--x': c.x, '--y': c.y, '--s': c.s, '--d': c.d, '--delay': c.delay } as CSSProperties}
        />
      ))}
      <svg className="tdfb-bg__trail" viewBox="0 0 1600 900" preserveAspectRatio="none">
        <defs>
          <linearGradient id={ribbonId}>
            <stop stopColor="#e9ce91" stopOpacity="0" />
            <stop offset=".25" stopColor="#efd8a0" />
            <stop offset=".7" stopColor="#f9e9c0" />
            <stop offset="1" stopColor="#f0ce7d" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="base" style={{ stroke: `url(#${ribbonId})` }} d={TRAIL} />
        <path className="runner" style={{ stroke: `url(#${ribbonId})` }} d={TRAIL} />
      </svg>
      <canvas className="tdfb-bg__particles" />
      <div className="tdfb-bg__veil" />
    </div>
  );
}
