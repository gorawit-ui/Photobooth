import { useEffect, useState } from 'react';
import { MIRROR_OUTPUT } from '../config/app';
import type { FrameConfig } from '../config/frames';
import { useSpacebar } from '../hooks/useSpacebar';
import { canvasToBlob, releaseCanvas } from '../lib/canvas';
import { composeFrame, loadFrameAssets } from '../lib/compose';

interface Props {
  frames: FrameConfig[];
  selectedId: string;
  onSelect: (id: string) => void;
  onConfirm: () => void;
  onBack: () => void;
}

/** Render every frame (with placeholder slots) into a small preview image. */
function useFramePreviews(frames: FrameConfig[]) {
  const [previews, setPreviews] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    frames.forEach(async (frame) => {
      const assets = await loadFrameAssets(frame);
      const canvas = composeFrame(frame, assets, [], { width: 400, height: 600, mirror: MIRROR_OUTPUT });
      const blob = await canvasToBlob(canvas, 'image/jpeg', 0.85);
      releaseCanvas(canvas);
      if (cancelled) return;
      const url = URL.createObjectURL(blob);
      urls.push(url);
      setPreviews((p) => ({ ...p, [frame.id]: url }));
    });
    return () => {
      cancelled = true;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [frames]);
  return previews;
}

export function FrameSelectScreen({ frames, selectedId, onSelect, onConfirm, onBack }: Props) {
  const previews = useFramePreviews(frames);
  useSpacebar(onConfirm);

  return (
    <main className="screen frame-screen">
      <header className="screen-header">
        <button type="button" className="btn btn-ghost btn-small" onClick={onBack}>
          ‹ หน้าแรก
        </button>
        <h2>เลือกกรอบรูป</h2>
        <span className="header-spacer" />
      </header>

      <div className="frame-grid scrollable" role="radiogroup" aria-label="กรอบรูป">
        {frames.map((f) => {
          const selected = f.id === selectedId;
          return (
            <button
              type="button"
              key={f.id}
              role="radio"
              aria-checked={selected}
              className={selected ? 'frame-card is-selected' : 'frame-card'}
              onClick={() => onSelect(f.id)}
              onDoubleClick={onConfirm}
            >
              <div className="frame-thumb">
                {previews[f.id] ? (
                  <img src={previews[f.id]} alt="" draggable={false} />
                ) : (
                  <div className="frame-thumb-loading" />
                )}
              </div>
              <span className="frame-name">{f.name}</span>
            </button>
          );
        })}
      </div>

      <footer className="screen-footer">
        <button type="button" className="btn btn-gold btn-large" onClick={onConfirm}>
          ใช้กรอบนี้ ›
        </button>
      </footer>
    </main>
  );
}
