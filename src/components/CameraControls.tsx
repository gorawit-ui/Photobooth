import { useEffect, useState } from 'react';
import { setExposure, setTorch, setZoom, type CameraFeatures } from '../lib/cameraControls';
import { SunIcon, TorchIcon, ZoomIcon } from './icons';

interface Props {
  track: MediaStreamTrack | null;
  features: CameraFeatures;
  disabled?: boolean;
}

const fmt = (v: number, step: number) => (step < 1 ? v.toFixed(1) : String(Math.round(v)));

/** Zoom / brightness / torch — only the ones this camera actually supports. */
export function CameraControls({ track, features, disabled }: Props) {
  const [zoom, setZoomValue] = useState(features.zoom?.value ?? 1);
  const [exposure, setExposureValue] = useState(features.exposure?.value ?? 0);
  const [torch, setTorchOn] = useState(false);

  // New camera → start from its own defaults.
  useEffect(() => {
    setZoomValue(features.zoom?.value ?? 1);
    setExposureValue(features.exposure?.value ?? 0);
    setTorchOn(false);
  }, [features]);

  if (!track || (!features.zoom && !features.exposure && !features.torch)) return null;

  return (
    <div className="camera-controls" aria-label="ปรับกล้อง">
      {features.zoom && (
        <label className="cc-row">
          <ZoomIcon />
          <span className="cc-label">ซูม</span>
          <input
            type="range"
            min={features.zoom.min}
            max={features.zoom.max}
            step={features.zoom.step}
            value={zoom}
            disabled={disabled}
            onChange={(e) => {
              const v = Number(e.target.value);
              setZoomValue(v);
              void setZoom(track, v);
            }}
          />
          <output className="cc-value">{fmt(zoom, features.zoom.step)}×</output>
        </label>
      )}
      {features.exposure && (
        <label className="cc-row">
          <SunIcon />
          <span className="cc-label">ความสว่าง</span>
          <input
            type="range"
            min={features.exposure.min}
            max={features.exposure.max}
            step={features.exposure.step}
            value={exposure}
            disabled={disabled}
            onChange={(e) => {
              const v = Number(e.target.value);
              setExposureValue(v);
              void setExposure(track, v);
            }}
          />
          <output className="cc-value">
            {exposure > 0 ? '+' : ''}
            {fmt(exposure, features.exposure.step)}
          </output>
        </label>
      )}
      {features.torch && (
        <button
          type="button"
          className="btn btn-ghost btn-small tool-btn"
          aria-pressed={torch}
          disabled={disabled}
          onClick={() => {
            setTorchOn(!torch);
            void setTorch(track, !torch);
          }}
        >
          <TorchIcon />
          {torch ? 'ไฟฉายเปิด' : 'ไฟฉายปิด'}
        </button>
      )}
    </div>
  );
}
