import { ArrowRightIcon } from '../components/icons';
import { MagicBackground } from '../components/MagicBackground';
import { useSpacebar } from '../hooks/useSpacebar';
import { isTouchDevice } from '../lib/device';

interface Props {
  motionPaused: boolean;
  onStart: () => void;
}

export function HomeScreen({ motionPaused, onStart }: Props) {
  useSpacebar(onStart);
  return (
    <main className="screen home-screen">
      <MagicBackground paused={motionPaused} />
      <section className="home-content" aria-labelledby="home-title">
        <p className="home-eyebrow">TDFB OUTING</p>
        <h1 className="home-title" id="home-title">
          <span>The Order</span> <span className="home-title-of">of Unity</span>
        </h1>
        <p className="home-thai">ภาคีแห่งความสามัคคี</p>
        <p className="home-sub">ถ่าย 4 ช็อต · เลือกกรอบ · รับรูปและ GIF กลับบ้าน</p>

        <button type="button" className="ticket-btn" onClick={onStart}>
          <span className="ticket-main">
            <span className="ticket-kicker" aria-hidden="true">
              ADMIT ONE · PLATFORM 1
            </span>
            <span className="ticket-label">เริ่มถ่ายรูป</span>
          </span>
          <span className="ticket-stub" aria-hidden="true">
            <ArrowRightIcon width="22" height="22" />
          </span>
        </button>
        {!isTouchDevice && (
          <p className="home-hint">
            หรือกด <kbd className="keycap">Space</kbd>
          </p>
        )}
      </section>
    </main>
  );
}
