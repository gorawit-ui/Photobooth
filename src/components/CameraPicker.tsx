interface Props {
  devices: MediaDeviceInfo[];
  value: string | undefined;
  onChange: (id: string) => void;
}

/** Only rendered when there is more than one camera. */
export function CameraPicker({ devices, value, onChange }: Props) {
  if (devices.length < 2) return null;
  return (
    <label className="camera-picker">
      <span>กล้อง</span>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {devices.map((d, i) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.label || `กล้อง ${i + 1}`}
          </option>
        ))}
      </select>
    </label>
  );
}
