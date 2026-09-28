import { useEffect, useRef } from 'react';

const EVENTS = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel'] as const;

/** Calls `onIdle` after `timeoutMs` without user input while `enabled`. */
export function useIdleTimer(enabled: boolean, timeoutMs: number, onIdle: () => void) {
  const cb = useRef(onIdle);
  cb.current = onIdle;

  useEffect(() => {
    if (!enabled) return;
    let timer = window.setTimeout(() => cb.current(), timeoutMs);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => cb.current(), timeoutMs);
    };
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [enabled, timeoutMs]);
}
