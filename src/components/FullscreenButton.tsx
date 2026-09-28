import { useEffect, useState } from 'react';
import { isIOS } from '../lib/device';
import { isFullscreen, isFullscreenSupported, onFullscreenChange, toggleFullscreen } from '../lib/fullscreen';

/**
 * Fullscreen toggle for desktop browsers. Hidden on iPad, where
 * "Add to Home Screen" gives a proper fullscreen app instead.
 */
export function FullscreenButton() {
  const [active, setActive] = useState(isFullscreen);
  useEffect(() => onFullscreenChange(() => setActive(isFullscreen())), []);

  if (isIOS || !isFullscreenSupported()) return null;

  return (
    <button
      type="button"
      className="icon-btn fullscreen-btn"
      onClick={toggleFullscreen}
      aria-label={active ? 'ออกจากโหมดเต็มจอ' : 'เต็มจอ'}
      title={active ? 'ออกจากโหมดเต็มจอ' : 'เต็มจอ'}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        {active ? (
          <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
      <span className="icon-btn-label">{active ? 'ออกจากเต็มจอ' : 'เต็มจอ'}</span>
    </button>
  );
}
