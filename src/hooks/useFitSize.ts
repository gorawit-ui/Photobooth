import { useCallback, useEffect, useState } from 'react';

/**
 * Largest width/height with the given aspect ratio that fits inside the
 * observed container (like object-fit: contain for a box).
 * Returns a callback ref so it keeps working if the container remounts.
 */
export function useFitSize<T extends HTMLElement>(ratio: number) {
  const [el, setEl] = useState<T | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const ref = useCallback((node: T | null) => setEl(node), []);

  useEffect(() => {
    if (!el) return;
    const measure = () => {
      const { clientWidth: w, clientHeight: h } = el;
      if (!w || !h) return;
      const width = Math.min(w, h * ratio);
      setSize({ width: Math.floor(width), height: Math.floor(width / ratio) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el, ratio]);

  return [ref, size] as const;
}
