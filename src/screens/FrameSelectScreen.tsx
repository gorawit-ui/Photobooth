import { useEffect, useState, type CSSProperties } from 'react';
import { MIRROR_OUTPUT } from '../config/app';
import type { FrameConfig, FrameGroup } from '../config/frames';
import { useSpacebar } from '../hooks/useSpacebar';
import { canvasToBlob, releaseCanvas } from '../lib/canvas';
import { composeFrame, loadFrameAssets } from '../lib/compose';

interface Props {
  frames: FrameConfig[];
  /** Picker tabs; empty → show every frame without tabs. */
  groups: FrameGroup[];
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

export function FrameSelectScreen({ frames, groups, selectedId, onSelect, onConfirm, onBack }: Props) {
  const previews = useFramePreviews(frames);
  useSpacebar(onConfirm);

  // Open on the tab that holds the selected frame.
  const selectedGroup = frames.find((f) => f.id === selectedId)?.group;
  const [tab, setTab] = useState(() => selectedGroup ?? groups[0]?.id ?? '');
  const activeTab = groups.some((g) => g.id === tab) ? tab : (selectedGroup ?? groups[0]?.id ?? '');
  const shown = groups.length ? frames.filter((f) => f.group === activeTab) : frames;

  const switchTab = (id: string) => {
    setTab(id);
    // Keep a visible frame selected so "ใช้กรอบนี้" always matches what's on screen.
    if (selectedGroup !== id) {
      const first = frames.find((f) => f.group === id);
      if (first) onSelect(first.id);
    }
  };

  return (
    <main className={groups.length ? 'screen frame-screen has-tabs' : 'screen frame-screen'}>
      <header className="screen-header">
        <button type="button" className="btn btn-ghost btn-small" onClick={onBack}>
          ‹ หน้าแรก
        </button>
        <h2>เลือกกรอบรูป</h2>
        <span className="header-spacer" />
      </header>

      {groups.length > 0 && (
        <div className="frame-tabs" role="tablist" aria-label="ประเภทกรอบ">
          {groups.map((g) => (
            <button
              type="button"
              key={g.id}
              role="tab"
              aria-selected={g.id === activeTab}
              className={g.id === activeTab ? 'frame-tab is-active' : 'frame-tab'}
              onClick={() => switchTab(g.id)}
            >
              {g.name}
              <span className="frame-tab-count">{frames.filter((f) => f.group === g.id).length}</span>
            </button>
          ))}
        </div>
      )}

      <div
        className="frame-grid scrollable"
        style={{ '--n': shown.length, '--cols-p': Math.ceil(shown.length / 2) } as CSSProperties}
      >
        <div className="frame-grid-inner" role="radiogroup" aria-label="กรอบรูป">
          {shown.map((f) => {
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
      </div>

      <footer className="screen-footer">
        <button type="button" className="btn btn-gold btn-large" onClick={onConfirm}>
          ใช้กรอบนี้ ›
        </button>
      </footer>
    </main>
  );
}
