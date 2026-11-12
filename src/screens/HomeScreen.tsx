import { MagicBackground } from '../components/MagicBackground';
import { useSpacebar } from '../hooks/useSpacebar';
import { isTouchDevice } from '../lib/device';

interface Props {
  motionPaused: boolean;
  onStart: () => void;
}

/** Scrolls + star between the English and Thai titles. */
function Flourish() {
  return (
    <svg className="home-flourish" viewBox="0 0 320 28" aria-hidden="true">
      <defs>
        <linearGradient id="flourishGold" x1="0" x2="1">
          <stop offset="0" stopColor="#d9b46a" stopOpacity="0" />
          <stop offset=".3" stopColor="#e9c97f" />
          <stop offset=".5" stopColor="#fff0c2" />
          <stop offset=".7" stopColor="#e9c97f" />
          <stop offset="1" stopColor="#d9b46a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#flourishGold)" strokeWidth="1.4" strokeLinecap="round">
        <path d="M8 14h112c10 0 14-8 22-8 6 0 8 5 4 8" />
        <path d="M312 14H200c-10 0-14-8-22-8-6 0-8 5-4 8" />
        <path d="M120 14c10 0 14 8 22 8 6 0 8-5 4-8" />
        <path d="M200 14c-10 0-14 8-22 8-6 0-8-5-4-8" />
      </g>
      <path d="M160 2c1.2 7 4.6 10.6 11.6 12-7 1.4-10.4 5-11.6 12-1.2-7-4.6-10.6-11.6-12 7-1.4 10.4-5 11.6-12Z" fill="#f6dc96" />
    </svg>
  );
}

/** Wax seal on the ticket stub, pressed with a gold arrow. */
function WaxSeal() {
  return (
    <svg className="ticket-seal" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <radialGradient id="sealWax" cx="38%" cy="32%" r="70%">
          <stop offset="0" stopColor="#b2394a" />
          <stop offset=".55" stopColor="#7d1f2f" />
          <stop offset="1" stopColor="#4c0f1b" />
        </radialGradient>
        <linearGradient id="sealGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff1c4" />
          <stop offset="1" stopColor="#d9a54a" />
        </linearGradient>
      </defs>
      <path
        d="M32 3c4 0 5 3 8.6 3.7 3.7.8 6.4-1.3 9.2 1.3 2.8 2.6 1.5 5.7 3.3 9 1.8 3.3 5.3 4.4 5.6 8.3.3 3.8-2.8 5.4-3 9.2-.2 3.8 2.4 6.1 1 9.7-1.4 3.5-4.9 3.6-7.5 6.4-2.6 2.8-2.6 6.3-6.2 7.7-3.6 1.4-5.9-1.3-9.8-1.1-3.8.2-5.9 3-9.6 1.8-3.6-1.2-3.9-4.7-6.6-7.4-2.7-2.7-6.2-2.6-7.7-6.1-1.5-3.6 1.2-5.8 1-9.7-.2-3.9-3.3-5.6-2.8-9.4.5-3.8 4-4.7 5.9-8 1.9-3.3.7-6.5 3.6-9 2.9-2.5 5.6-.3 9.3-1C27 6 28 3 32 3Z"
        fill="url(#sealWax)"
      />
      <circle cx="32" cy="32" r="17" fill="none" stroke="#5a1220" strokeOpacity=".7" strokeWidth="2" />
      <circle cx="32" cy="32" r="17" fill="none" stroke="#c45a68" strokeOpacity=".35" strokeWidth="1" transform="translate(-.8 -.8)" />
      <path d="M23 32h17M34 25.5l6.5 6.5-6.5 6.5" fill="none" stroke="url(#sealGold)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Gold filigree for the ticket corners (mirrored with CSS). */
function Corner({ pos }: { pos: string }) {
  return (
    <svg className={`ticket-corner ticket-corner--${pos}`} viewBox="0 0 28 28" aria-hidden="true">
      <path d="M2 26V9c0-4 3-7 7-7h17" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6 22V11c0-3 2-5 5-5h11" fill="none" stroke="currentColor" strokeWidth=".8" opacity=".7" />
      <path d="M9.5 9.5c2.5-.2 3.8 1 3.6 3.4-2.4.3-3.8-1-3.6-3.4Z" fill="currentColor" />
    </svg>
  );
}

export function HomeScreen({ motionPaused, onStart }: Props) {
  useSpacebar(onStart);
  return (
    <main className={motionPaused ? 'screen home-screen is-still' : 'screen home-screen'}>
      <MagicBackground paused={motionPaused} />
      <section className="home-content" aria-labelledby="home-title">
        <p className="home-eyebrow">TDFB OUTING</p>
        <h1 className="home-title" id="home-title">
          <span className="home-title-line" data-text="The Order">
            The Order
          </span>{' '}
          <span className="home-title-line home-title-of" data-text="of Unity">
            of Unity
          </span>
        </h1>
        <Flourish />
        <p className="home-thai">
          <span className="home-thai-star" aria-hidden="true" />
          ภาคีแห่งความสามัคคี
          <span className="home-thai-star" aria-hidden="true" />
        </p>
        <p className="home-sub">ถ่าย 4 ช็อต · เลือกกรอบ · รับรูปและ GIF กลับบ้าน</p>

        <button type="button" className="ticket-btn" onClick={onStart}>
          <span className="ticket-body">
            <Corner pos="tl" />
            <Corner pos="bl" />
            <span className="ticket-main">
              <span className="ticket-kicker" aria-hidden="true">
                Admit One · Platform 1
              </span>
              <span className="ticket-label">เริ่มถ่ายรูป</span>
            </span>
            <span className="ticket-stub" aria-hidden="true">
              <WaxSeal />
            </span>
            <span className="ticket-sheen" aria-hidden="true" />
          </span>
          <span className="ticket-sparkles" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
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
