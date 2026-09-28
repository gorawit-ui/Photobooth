import { memo, useMemo } from 'react';

interface Star {
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
  sparkle: boolean;
}

function makeStars(count: number): Star[] {
  return Array.from({ length: count }, (_, i) => ({
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: 1 + Math.random() * 2.2,
    delay: Math.random() * 6,
    duration: 2.5 + Math.random() * 4,
    sparkle: i % 14 === 0,
  }));
}

/** Softly twinkling star background (pure CSS animation, very cheap). */
export const StarField = memo(function StarField() {
  const stars = useMemo(() => makeStars(90), []);
  return (
    <div className="starfield" aria-hidden="true">
      <div className="starfield-glow" />
      {stars.map((s, i) => (
        <span
          key={i}
          className={s.sparkle ? 'star star--sparkle' : 'star'}
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.sparkle ? s.size * 6 : s.size,
            height: s.sparkle ? s.size * 6 : s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}
    </div>
  );
});
