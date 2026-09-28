/**
 * Stop accidental zooming, scrolling, text selection and context menus —
 * the booth should behave like a kiosk app. Elements with the
 * `.scrollable` class may still scroll with one finger.
 */
export function installInteractionGuards(): void {
  const opts = { passive: false } as const;
  const prevent = (e: Event) => e.preventDefault();

  // Safari pinch-zoom gestures
  document.addEventListener('gesturestart', prevent, opts);
  document.addEventListener('gesturechange', prevent, opts);
  document.addEventListener('gestureend', prevent, opts);

  // Pinch / scroll bounce (allow one-finger scroll inside .scrollable)
  document.addEventListener(
    'touchmove',
    (e) => {
      const target = e.target as Element | null;
      if (e.touches.length > 1 || !target?.closest?.('.scrollable')) e.preventDefault();
    },
    opts,
  );

  // Double-tap zoom is disabled via CSS `touch-action: manipulation`.
  document.addEventListener('dblclick', prevent, opts);

  // Ctrl/⌘ + wheel and Ctrl/⌘ + (+ - 0) zoom on desktop
  window.addEventListener('wheel', (e) => e.ctrlKey && e.preventDefault(), opts);
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)) e.preventDefault();
  });

  // Long-press menus, drag ghost images, text selection
  document.addEventListener('contextmenu', prevent);
  document.addEventListener('dragstart', prevent);
  document.addEventListener('selectstart', (e) => {
    const target = e.target as Element | null;
    if (!target?.closest?.('input, textarea')) e.preventDefault();
  });
}
