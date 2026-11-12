import { useEffect, useState } from 'react';
import { sound } from '../lib/sound';
import { SoundOffIcon, SoundOnIcon } from './icons';

export function SoundToggle() {
  const [muted, setMuted] = useState(() => sound.isMuted());
  useEffect(() => sound.subscribe(setMuted), []);
  return (
    <button
      type="button"
      className="nav-btn"
      onClick={() => {
        sound.unlock();
        sound.setMuted(!muted);
      }}
      aria-label="เสียง"
      aria-pressed={!muted}
      title={muted ? 'เปิดเสียง' : 'ปิดเสียง'}
    >
      {muted ? <SoundOffIcon /> : <SoundOnIcon />}
      <span className="nav-btn-label">{muted ? 'เสียงปิด' : 'เสียงเปิด'}</span>
    </button>
  );
}
