import { useSpacebar } from '../hooks/useSpacebar';
import { isTouchDevice } from '../lib/device';

export function HomeScreen({ onStart }: { onStart: () => void }) {
  useSpacebar(onStart);
  return (
    <main className="screen home-screen">
      <div className="home-moon" aria-hidden="true" />
      <p className="eyebrow">✦ Magical Night ✦</p>
      <h1 className="home-title">
        โฟโต้บูธ<span>แห่งเวทมนตร์</span>
      </h1>
      <p className="home-sub">ถ่าย 4 ช็อต เลือกกรอบ รับรูปและ GIF กลับบ้าน</p>
      <button type="button" className="btn btn-gold btn-hero" onClick={onStart}>
        ✨ เริ่มถ่ายรูป
      </button>
      {!isTouchDevice && <p className="hint">หรือกด Spacebar</p>}
    </main>
  );
}
