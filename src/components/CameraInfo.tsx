import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { describeCamera } from '../lib/cameraControls';
import { cameraNames } from './CameraPicker';
import { CloseIcon } from './icons';

interface Props {
  stream: MediaStream | null;
  devices: MediaDeviceInfo[];
  onClose: () => void;
}

/** What the browser really gets from the camera — for checking the Sony / a phone before the event. */
export function CameraInfo({ stream, devices, onClose }: Props) {
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
        <p className="hint">ถ่ายภาพหน้าจอนี้ส่งให้ทีมได้ เพื่อดูว่ากล้องให้ภาพความละเอียดเท่าไหร่</p>
      </div>
    </div>,
    document.body,
  );
}

