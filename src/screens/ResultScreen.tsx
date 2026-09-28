import { MagicLoader } from '../components/MagicLoader';
import type { Outputs } from '../types';

interface Props {
  outputs: Outputs | null;
  error: boolean;
  onRetake: () => void;
  onConfirm: () => void;
  onRetryGenerate: () => void;
}

export function ResultScreen({ outputs, error, onRetake, onConfirm, onRetryGenerate }: Props) {
  if (error) {
    return (
      <main className="screen result-screen result-screen--center">
        <div className="panel">
          <h2>เวทมนตร์ขัดข้องนิดหน่อย</h2>
          <p className="panel-text">สร้างไฟล์ไม่สำเร็จ ลองอีกครั้งหรือถ่ายใหม่</p>
          <div className="button-row">
            <button type="button" className="btn btn-ghost" onClick={onRetake}>
              ถ่ายใหม่
            </button>
            <button type="button" className="btn btn-gold" onClick={onRetryGenerate}>
              ลองอีกครั้ง
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!outputs) {
    return (
      <main className="screen result-screen result-screen--center">
        <MagicLoader />
      </main>
    );
  }

  return (
    <main className="screen result-screen">
      <h2 className="screen-title">✨ สำเร็จแล้ว! ✨</h2>
      <div className="result-media">
        <figure className="result-card">
          <img src={outputs.jpgUrl} alt="รูปรวม 4 ช็อต" draggable={false} />
          <figcaption>รูปรวม</figcaption>
        </figure>
        <figure className="result-card">
          <img src={outputs.gifUrl} alt="GIF เคลื่อนไหว" draggable={false} />
          <figcaption>GIF</figcaption>
        </figure>
      </div>
      <footer className="screen-footer">
        <button type="button" className="btn btn-ghost btn-large" onClick={onRetake}>
          ↺ ถ่ายใหม่
        </button>
        <button type="button" className="btn btn-gold btn-large" onClick={onConfirm}>
          ยืนยัน ✓
        </button>
      </footer>
    </main>
  );
}
