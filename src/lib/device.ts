/** Lightweight device / browser detection used for UI hints only. */

export type BrowserKind = 'edge' | 'chrome' | 'safari' | 'firefox' | 'other';

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

/** iPadOS 13+ reports itself as "Macintosh", so also check for touch support. */
export const isIPad =
  /iPad/.test(ua) ||
  (/Macintosh/.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);

export const isIOS = isIPad || /iPhone|iPod/.test(ua);

export const isTouchDevice =
  typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

export function detectBrowser(): BrowserKind {
  if (/Edg(e|A|iOS)?\//.test(ua)) return 'edge';
  if (/Firefox|FxiOS/.test(ua)) return 'firefox';
  if (/Chrome|CriOS|Chromium/.test(ua)) return 'chrome';
  if (/Safari/.test(ua)) return 'safari';
  return 'other';
}

/** Launched from the iPad Home Screen (or an installed PWA). */
export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    (typeof window.matchMedia === 'function' &&
      (window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: standalone)').matches))
  );
}
