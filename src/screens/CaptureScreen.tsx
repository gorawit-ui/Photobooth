import { useCallback, useEffect, useRef, useState } from 'react';
import {
  COUNTDOWN_FIRST_SECONDS,
  COUNTDOWN_NEXT_SECONDS,
  MIRROR_OUTPUT,
  PAUSE_BETWEEN_SHOTS_MS,
  SHOT_COUNT,
} from '../config/app';
import type { FrameConfig } from '../config/frames';
import { CameraPicker } from '../components/CameraPicker';
import { MagicSparkles } from '../components/MagicSparkles';
import { MagicLoader } from '../components/MagicLoader';
import { PermissionHelp } from '../components/PermissionHelp';
import type { CameraState } from '../hooks/useCamera';
import { useFitSize } from '../hooks/useFitSize';
import { useSpacebar } from '../hooks/useSpacebar';
import { captureFrame, waitForVideo } from '../lib/camera';
import { canvasToBlob, releaseCanvas } from '../lib/canvas';
import { isTouchDevice } from '../lib/device';
import { sound } from '../lib/sound';
import type { Shot } from '../types';

interface Props {
  frame: FrameConfig;
  camera: CameraState;
  /** Called right after each shot is taken (index 0 = a new run). */
  onShot?: (shot: Shot, index: number) => void;
  onComplete: (shots: Shot[]) => void;
  onBack: () => void;
  /** True while the countdown sequence runs (pauses the idle timer). */
  onBusyChange: (busy: boolean) => void;
}

type Phase = 'ready' | 'running';

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

function disposeShots(shots: Shot[]) {
  shots.forEach((s) => {
    URL.revokeObjectURL(s.url);
    releaseCanvas(s.canvas);
  });
}

export function CaptureScreen({ frame, camera, onShot, onComplete, onBack, onBusyChange }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const aliveRef = useRef(true);
  const [phase, setPhase] = useState<Phase>('ready');
  const [count, setCount] = useState<number | null>(null);
  const [shotIndex, setShotIndex] = useState(0);
  const [shots, setShots] = useState<Shot[]>([]);
  const [flashKey, setFlashKey] = useState(0);
  const [failed, setFailed] = useState(false);

  // Preview uses the slot's aspect ratio so what you see is what gets cropped.
  const slot = frame.slots[0];
  const [stageRef, fit] = useFitSize<HTMLDivElement>(slot.width / slot.height);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = camera.stream;
    if (camera.stream) video.play().catch(() => {});
  }, [camera.stream]);

  const start = useCallback(async () => {
    if (phase !== 'ready' || camera.status !== 'ready') return;
    setPhase('running');
    setFailed(false);
    setShots([]);
    onBusyChange(true);
    const taken: Shot[] = [];
    try {
      for (let i = 0; i < SHOT_COUNT; i++) {
        setShotIndex(i);
        const seconds = i === 0 ? COUNTDOWN_FIRST_SECONDS : COUNTDOWN_NEXT_SECONDS;
        for (let c = seconds; c > 0; c--) {
          setCount(c);
          sound.tick(c === 1);
          await sleep(1000);
          if (!aliveRef.current) throw new Error('aborted');
        }
        setCount(null);
        const video = videoRef.current;
        if (!video) throw new Error('no video');
        await waitForVideo(video);
        const canvas = captureFrame(video);
        sound.shutter();
        setFlashKey((k) => k + 1);
        const blob = await canvasToBlob(canvas, 'image/jpeg', 0.95);
        const shot: Shot = { canvas, blob, url: URL.createObjectURL(blob) };
        taken.push(shot);
        if (!aliveRef.current) throw new Error('aborted');
        setShots([...taken]);
        onShot?.(shot, i);
        await sleep(i < SHOT_COUNT - 1 ? PAUSE_BETWEEN_SHOTS_MS : 800);
        if (!aliveRef.current) throw new Error('aborted');
      }
      onBusyChange(false);
      onComplete(taken);
    } catch (err) {
      disposeShots(taken);
      onBusyChange(false);
      if (!aliveRef.current) return;
      console.error(err);
      setShots([]);
      setCount(null);
      setPhase('ready');
      setFailed(true);
    }
  }, [phase, camera.status, onBusyChange, onShot, onComplete]);

  useSpacebar(start, phase === 'ready' && camera.status === 'ready');

  if (camera.status === 'error' && camera.error) {
    return (
      <main className="screen capture-screen capture-screen--error">
        <PermissionHelp kind={camera.error} onRetry={camera.retry} onBack={onBack} />
      </main>
    );
  }

  const running = phase === 'running';

  return (
    <main className="screen capture-screen">
      <div className="capture-stage" ref={stageRef}>
        <div
          className="preview"
          style={fit ? { width: fit.width, height: fit.height } : { visibility: 'hidden' }}
        >
          <video ref={videoRef} className="preview-video" autoPlay playsInline muted />
          <MagicSparkles burstKey={flashKey} />
          <div className="preview-frame" aria-hidden="true" />
          {camera.status !== 'ready' && (
            <div className="preview-overlay">
              <MagicLoader text="กำลังเปิดกล้อง..." />
            </div>
          )}
          {running && (
            <div className="shot-label">
              ช็อต {Math.min(shotIndex + 1, SHOT_COUNT)}/{SHOT_COUNT}
            </div>
          )}
          {count !== null && (
            <div className="countdown" key={`${shotIndex}-${count}`} aria-live="assertive">
              {count}
            </div>
          )}
        </div>
      </div>

      <aside className="capture-panel">
        {running ? (
          <div className="panel-status">
            <p className="panel-big">
              ช็อต {Math.min(shotIndex + 1, SHOT_COUNT)}/{SHOT_COUNT}
            </p>
            <p className="panel-text">{count !== null ? 'เตรียมโพสท่า!' : 'ยิ้มมม ✨'}</p>
          </div>
        ) : (
          <>
            <div className="panel-status">
              <p className="panel-title">{frame.name}</p>
              <p className="panel-text">
                ถ่ายทั้งหมด {SHOT_COUNT} ช็อต ช็อตแรกนับถอยหลัง {COUNTDOWN_FIRST_SECONDS} วินาที ช็อตถัดไป {COUNTDOWN_NEXT_SECONDS} วินาที
              </p>
              {failed && <p className="panel-error">ถ่ายไม่สำเร็จ ลองกดเริ่มใหม่อีกครั้ง</p>}
            </div>
            <button
              type="button"
              className="btn btn-gold btn-hero btn-shoot"
              onClick={start}
              disabled={camera.status !== 'ready'}
            >
              📸 เริ่มถ่าย
            </button>
            {!isTouchDevice && <p className="hint">หรือกด Spacebar</p>}
            <div className="panel-tools">
              <CameraPicker devices={camera.devices} value={camera.deviceId} onChange={camera.selectDevice} />
              <button type="button" className="btn btn-ghost btn-small" onClick={onBack}>
                ‹ เปลี่ยนกรอบ
              </button>
            </div>
          </>
        )}
      </aside>

      <div className="thumb-strip" aria-label="รูปที่ถ่ายแล้ว">
        {Array.from({ length: SHOT_COUNT }, (_, i) => (
          <div key={i} className={shots[i] ? 'thumb is-filled' : 'thumb'}>
            {shots[i] ? (
              <img
                src={shots[i].url}
                alt={`ช็อต ${i + 1}`}
                draggable={false}
                className={MIRROR_OUTPUT ? 'mirrored' : undefined}
              />
            ) : (
              <span>{i + 1}</span>
            )}
          </div>
        ))}
      </div>

      {flashKey > 0 && <div className="flash" key={flashKey} aria-hidden="true" />}
    </main>
  );
}
