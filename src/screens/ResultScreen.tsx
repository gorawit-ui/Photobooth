import { MagicLoader } from '../components/MagicLoader';
import { FILTERS } from '../lib/filters';
import type { Look } from '../lib/look';
import type { Outputs } from '../types';

interface Props {
  outputs: Outputs | null;
  error: boolean;
  look: Look;
  /** False if segmentation failed or found nobody — hides the scene toggle. */
  sceneAvailable: boolean;
  /** Outputs are being rebuilt after a look change. */
  rendering: boolean;
  onLookChange: (look: Look) => void;
  onRetake: () => void;
  onConfirm: () => void;
  onRetryGenerate: () => void;
}

export function ResultScreen({
  outputs,
  error,
  look,
  sceneAvailable,
  rendering,
  onLookChange,
  onRetake,
  onConfirm,
  onRetryGenerate,
}: Props) {
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
      <div className="result-body">
        <div className={rendering ? 'result-media is-busy' : 'result-media'} aria-busy={rendering}>
          <figure className="result-card">
            <img src={outputs.jpgUrl} alt="รูปรวม 4 ช็อต" draggable={false} />
            <figcaption>รูปรวม</figcaption>
          </figure>
          <figure className="result-card">
            <img src={outputs.gifUrl} alt="GIF เคลื่อนไหว" draggable={false} />
            <figcaption>GIF</figcaption>
          </figure>
          {rendering && <div className="result-busy" aria-hidden="true" />}
        </div>

        <aside className="result-side">
          {sceneAvailable && (
            <section className="look-group">
              <h3>ฉากหลัง</h3>
              <div className="seg-toggle" role="radiogroup" aria-label="ฉากหลัง">
                <button
                  type="button"
                  role="radio"
                  aria-checked={look.scene}
                  className={look.scene ? 'seg is-on' : 'seg'}
                  onClick={() => onLookChange({ ...look, scene: true })}
                >
                  🏰 ฉากเวทมนตร์
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={!look.scene}
                  className={!look.scene ? 'seg is-on' : 'seg'}
                  onClick={() => onLookChange({ ...look, scene: false })}
                >
                  📷 ฉากจริง
                </button>
              </div>
            </section>
          )}
          <section className="look-group">
            <h3>ฟิลเตอร์</h3>
            <div className="filter-chips" role="radiogroup" aria-label="ฟิลเตอร์สี">
              {FILTERS.map((f) => (
                <button
                  type="button"
                  key={f.id}
                  role="radio"
                  aria-checked={look.filter === f.id}
                  className={look.filter === f.id ? 'chip is-on' : 'chip'}
                  onClick={() => onLookChange({ ...look, filter: f.id })}
                >
                  <span className="chip-swatch" style={{ background: f.swatch }} />
                  {f.name}
                </button>
              ))}
            </div>
          </section>
          <div className="result-actions">
            <button type="button" className="btn btn-ghost btn-large" onClick={onRetake}>
              ↺ ถ่ายใหม่
            </button>
            <button type="button" className="btn btn-gold btn-large" onClick={onConfirm} disabled={rendering}>
              ยืนยัน ✓
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
