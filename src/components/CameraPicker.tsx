import { InfoIcon } from './icons';

interface Props {
  devices: MediaDeviceInfo[];
  value: string | undefined;
  onChange: (id: string) => void;
  /** Opens the camera info panel (shown next to the picker). */
  onInfo?: () => void;
}

/**
 * Friendly names: phones report e.g. "camera2 0, facing back" — show
 * "กล้องหลัง 1" instead, and number lenses when there are several.
 */
export function cameraNames(devices: MediaDeviceInfo[]): string[] {
  const kind = (d: MediaDeviceInfo) =>
    /front|user|face ?time|หน้า/i.test(d.label) ? 'front' : /back|rear|environment|หลัง/i.test(d.label) ? 'back' : 'other';
  const counts: Record<string, number> = {};
  devices.forEach((d) => (counts[kind(d)] = (counts[kind(d)] ?? 0) + 1));
  const seen: Record<string, number> = {};
  return devices.map((d, i) => {
    const k = kind(d);
    if (k === 'other') return d.label || `กล้อง ${i + 1}`;
    seen[k] = (seen[k] ?? 0) + 1;
    const base = k === 'front' ? 'กล้องหน้า' : 'กล้องหลัง';
    return counts[k] > 1 ? `${base} ${seen[k]}` : base;
  });
}

export function CameraPicker({ devices, value, onChange, onInfo }: Props) {
  const names = cameraNames(devices);
  return (
    <div className="camera-picker">
      {devices.length > 1 && (
        <label className="camera-picker-select">
          <span>กล้อง</span>
          <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} aria-label="เลือกกล้อง">
            {devices.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId} title={d.label}>
                {names[i]}
              </option>
            ))}
          </select>
        </label>
      )}
      {onInfo && (
        <button type="button" className="btn btn-ghost btn-small icon-only" onClick={onInfo} aria-label="ข้อมูลกล้อง" title="ข้อมูลกล้อง">
          <InfoIcon />
        </button>
      )}
    </div>
  );
}
