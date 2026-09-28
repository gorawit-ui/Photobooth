import { useEffect, useRef } from 'react';

/** Run `handler` when Space (or Enter) is pressed while `enabled`. */
export function useSpacebar(handler: () => void, enabled = true) {
  const cb = useRef(handler);
  cb.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ' && e.key !== 'Enter') return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('select, input, textarea')) return;
      e.preventDefault(); // no page scroll, no double-activation of a focused button
      if (!e.repeat) cb.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
