import { useEffect, useState } from 'react';
import { isIOS } from '../lib/device';
import { CollapseIcon, ExpandIcon } from './icons';
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
      className="nav-btn"
      onClick={toggleFullscreen}
      aria-label={active ? 'ออกจากโหมดเต็มจอ' : 'เต็มจอ'}
      title={active ? 'ออกจากโหมดเต็มจอ' : 'เต็มจอ'}
    >
      {active ? <CollapseIcon /> : <ExpandIcon />}
      <span className="nav-btn-label">{active ? 'ออกจากเต็มจอ' : 'เต็มจอ'}</span>
    </button>
  );
}
