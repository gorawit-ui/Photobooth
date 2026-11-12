import { prefersReducedMotion } from '../lib/magicBackground';
import { MotionOffIcon, MotionOnIcon } from './icons';

interface Props {
  paused: boolean;
  onChange: (paused: boolean) => void;
}

/** Pauses the landing background's ambient motion. Disabled when the OS asks for reduced motion. */
export function MotionToggle({ paused, onChange }: Props) {
  const forced = prefersReducedMotion();
  const on = !paused && !forced;
  return (
    <button
      type="button"
      className="nav-btn"
      onClick={() => onChange(!paused)}
      disabled={forced}
      aria-label="ภาพเคลื่อนไหว"
      aria-pressed={on}
      title={forced ? 'ปิดอยู่ตามการตั้งค่าลดการเคลื่อนไหวของเครื่อง' : on ? 'หยุดภาพเคลื่อนไหว' : 'เปิดภาพเคลื่อนไหว'}
    >
      {on ? <MotionOnIcon /> : <MotionOffIcon />}
      <span className="nav-btn-label">{on ? 'Motion เปิด' : 'Motion ปิด'}</span>
    </button>
  );
}
