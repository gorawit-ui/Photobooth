import { useSpacebar } from '../hooks/useSpacebar';
import { isTouchDevice } from '../lib/device';

/** Moon, sparkle trail and an original castle silhouette (decoration only). */
function HomeScenery() {
  return (
    <>
      <svg className="home-sky" aria-hidden="true" viewBox="0 0 1366 768" preserveAspectRatio="xMidYMid slice">
        <g className="home-sparkles" fill="#F6D98C">
          <path d="M760 160 Q760 172 772 172 Q760 172 760 184 Q760 172 748 172 Q760 172 760 160Z" />
          <path d="M640 110 Q640 120 650 120 Q640 120 640 130 Q640 120 630 120 Q640 120 640 110Z" />
          <path d="M560 60 Q560 68 568 68 Q560 68 560 76 Q560 68 552 68 Q560 68 560 60Z" />
          <path d="M1260 230 Q1260 241 1271 241 Q1260 241 1260 252 Q1260 241 1249 241 Q1260 241 1260 230Z" />
        </g>
        <path className="home-moon-shape" d="M1180 92 a34 34 0 1 0 30 52 a28 28 0 1 1 -30 -52Z" />
        <path
          d="M-30 690 C 180 600, 260 760, 470 700 S 800 470, 980 430"
          fill="none"
          stroke="#F6D98C"
          strokeWidth="10"
          strokeLinecap="round"
          opacity=".12"
        />
        <path
          className="home-trail"
          d="M-30 690 C 180 600, 260 760, 470 700 S 800 470, 980 430"
          fill="none"
          stroke="#FFE9A8"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeDasharray="1 9"
        />
      </svg>

      <svg className="home-castle" aria-hidden="true" viewBox="0 0 600 420" preserveAspectRatio="xMaxYMax meet">
        <defs>
          <linearGradient id="homeHill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#101A45" />
            <stop offset="1" stopColor="#050816" />
          </linearGradient>
        </defs>
        <g fill="#0A1236">
          <rect x="250" y="150" width="40" height="170" />
          <polygon points="244,150 270,72 296,150" />
          <rect x="300" y="190" width="60" height="130" />
          <polygon points="294,190 330,112 366,190" />
          <rect x="200" y="210" width="36" height="110" />
          <polygon points="195,210 218,152 241,210" />
          <rect x="370" y="218" width="32" height="102" />
          <polygon points="365,218 386,170 407,218" />
          <rect x="412" y="238" width="26" height="82" />
          <polygon points="408,238 425,200 442,238" />
          <rect x="158" y="244" width="30" height="76" />
          <polygon points="154,244 173,206 192,244" />
          <rect x="176" y="262" width="270" height="58" />
          <rect x="268" y="52" width="3" height="22" />
          <polygon points="271,52 286,57 271,62" />
          <rect x="329" y="94" width="3" height="20" />
          <polygon points="332,94 345,98 332,102" />
        </g>
        <g className="home-windows" fill="#F5C86A">
          <rect x="266" y="176" width="7" height="12" rx="3" />
          <rect x="266" y="210" width="7" height="12" rx="3" />
          <rect x="316" y="214" width="7" height="12" rx="3" />
          <rect x="337" y="214" width="7" height="12" rx="3" />
          <rect x="214" y="234" width="6" height="10" rx="3" />
          <rect x="382" y="240" width="6" height="10" rx="3" />
          <rect x="196" y="280" width="6" height="10" rx="3" />
          <rect x="232" y="280" width="6" height="10" rx="3" />
          <rect x="292" y="280" width="6" height="10" rx="3" />
          <rect x="352" y="280" width="6" height="10" rx="3" />
          <rect x="404" y="280" width="6" height="10" rx="3" />
          <rect x="170" y="262" width="5" height="9" rx="2.5" />
        </g>
        <path d="M0 420 L0 330 Q120 296 220 312 Q330 286 430 304 Q520 292 600 318 L600 420Z" fill="url(#homeHill)" />
        <path d="M60 420 Q70 380 110 372 Q150 380 160 420Z M470 420 Q480 372 520 366 Q560 372 570 420Z" fill="#060A1F" />
      </svg>
    </>
  );
}

export function HomeScreen({ onStart }: { onStart: () => void }) {
  useSpacebar(onStart);
  return (
    <main className="screen home-screen">
      <HomeScenery />
      <section className="home-content">
        <p className="home-eyebrow">TDFB OUTING</p>
        <h1 className="home-title">
          The Order
          <br />
          of Unity
        </h1>
        <div className="home-thai">
          <span aria-hidden="true" />
          <p>ภาคีแห่งความสามัคคี</p>
          <span aria-hidden="true" />
        </div>
        <p className="home-sub">ถ่าย 4 ช็อต · เลือกกรอบ · รับรูปและ GIF กลับบ้าน</p>

        <button type="button" className="ticket-btn" onClick={onStart}>
          <span className="ticket-main">
            <span className="ticket-kicker">ADMIT ONE · PLATFORM 1</span>
            <span className="ticket-label">เริ่มถ่ายรูป</span>
          </span>
          <span className="ticket-stub" aria-hidden="true">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2 Q12 12 22 12 Q12 12 12 22 Q12 12 2 12 Q12 12 12 2Z" />
            </svg>
          </span>
        </button>
        {!isTouchDevice && <p className="hint home-hint">หรือกด Spacebar</p>}
      </section>
    </main>
  );
}
