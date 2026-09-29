import { useEffect, useState } from 'react';
import { sound } from '../lib/sound';

export function SoundToggle() {
  const [muted, setMuted] = useState(() => sound.isMuted());
  useEffect(() => sound.subscribe(setMuted), []);
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={() => {
        sound.unlock();
        sound.setMuted(!muted);
      }}
      aria-label={muted ? 'เปิดเสียง' : 'ปิดเสียง'}
      aria-pressed={!muted}
      title={muted ? 'เปิดเสียง' : 'ปิดเสียง'}
    >
      <span aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
      <span className="icon-btn-label">{muted ? 'เสียงปิด' : 'เสียงเปิด'}</span>
    </button>
  );
}
