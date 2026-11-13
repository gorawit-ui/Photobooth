import { useEffect, useState } from 'react';
import type { TetherState } from '../hooks/useTether';
import { createPortal } from 'react-dom';
import { describeCamera } from '../lib/cameraControls';
import { cameraNames } from './CameraPicker';
import { CloseIcon } from './icons';

interface Props {
  stream: MediaStream | null;
  devices: MediaDeviceInfo[];
  tether?: TetherState;
  onClose: () => void;
}

/** What the browser really gets from the camera — for checking the Sony / a phone before the event. */
export function CameraInfo({ stream, devices, tether, onClose }: Props) {
  const [lines, setLines] = useState<[string, string][]>([]);
  useEffect(() => {
    let alive = true;
    void describeCamera(stream, devices).then((r) => alive && setLines(r.lines));
    return () => {
      alive = false;
    };
  }, [stream, devices]);
  const names = cameraNames(devices);

  // Portal to <body> so the dialog sits above the navbar (screens have their own stacking context).
  return createPortal(
    <div className="camera-info-backdrop" role="dialog" aria-modal="true" aria-labelledby="camera-info-title" onClick={onClose}>
      <div className="camera-info panel scrollable" onClick={(e) => e.stopPropagation()}>
        <div className="camera-info-head">
          <h2 id="camera-info-title">ข้อมูลกล้อง</h2>
          <button type="button" className="btn btn-ghost btn-small icon-only" onClick={onClose} aria-label="ปิด">
            <CloseIcon />
          </button>
        </div>
        <dl className="camera-info-list">
          {lines.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <h3>กล้องทั้งหมดที่เบราว์เซอร์เห็น ({devices.length})</h3>
        <ul className="camera-info-devices">
          {devices.map((d, i) => (
            <li key={d.deviceId}>
              <strong>{names[i]}</strong> <span>{d.label || '(ไม่มีชื่อ)'}</span>
            </li>
          ))}
        </ul>
        {tether && <TetherSettings tether={tether} />}
        <p className="hint">ถ่ายภาพหน้าจอนี้ส่งให้ทีมได้ เพื่อดูว่ากล้องให้ภาพความละเอียดเท่าไหร่</p>
      </div>
    </div>,
    document.body,
  );
}

const STATE_TEXT: Record<TetherState['state'], string> = {
  off: 'ปิดอยู่',
  checking: 'กำลังหา…',
  missing: 'ไม่พบโปรแกรม (ยังไม่ได้เปิด หรือเบราว์เซอร์ยังไม่อนุญาต)',
  nocamera: 'เจอโปรแกรมแล้ว แต่ยังไม่เห็นกล้อง',
  ready: 'พร้อมถ่าย',
};

/** Staff switch for the Sony Bridge (tether/sony-bridge.mjs). */
function TetherSettings({ tether }: { tether: TetherState }) {
  const [url, setUrl] = useState(tether.url);
  return (
    <section className="tether-settings">
      <h3>ชัตเตอร์กล้องจริงผ่านโปรแกรมตัวกลาง (Sony Bridge)</h3>
      <p className="hint">
        ให้เว็บสั่งชัตเตอร์ Sony ผ่าน USB แล้วใช้ไฟล์ JPEG เต็มความละเอียดของกล้อง ต้องเปิดโปรแกรม <code>npm run bridge</code> บนเครื่องนี้ก่อน
      </p>
      <label className="tether-toggle">
        <input type="checkbox" checked={tether.enabled} onChange={(e) => tether.setEnabled(e.target.checked)} />
        <span>ใช้ Sony Bridge</span>
      </label>
      {tether.enabled && (
        <>
          <dl className="camera-info-list">
            <div>
              <dt>สถานะ</dt>
              <dd>{STATE_TEXT[tether.state]}</dd>
            </div>
            {tether.status && (
              <>
                <div>
                  <dt>กล้อง</dt>
                  <dd>{tether.status.camera ?? '-'}</dd>
                </div>
                <div>
                  <dt>โหมด</dt>
                  <dd>{tether.status.backend === 'mock' ? 'กล้องจำลอง (ทดสอบ)' : tether.status.backend}</dd>
                </div>
              </>
            )}
          </dl>
          <form
            className="tether-url"
            onSubmit={(e) => {
              e.preventDefault();
              tether.setUrl(url.trim());
            }}
          >
            <label>
              <span>ที่อยู่โปรแกรม</span>
              <input value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false} inputMode="url" />
            </label>
            <button type="submit" className="btn btn-ghost btn-small">
              บันทึก
            </button>
          </form>
          {tether.hasLiveview && <p className="hint">เลือก “{'Sony · ภาพสดจากโปรแกรมตัวกลาง'}” ในรายการกล้อง ถ้าไม่มี HDMI capture card</p>}
        </>
      )}
    </section>
  );
}
