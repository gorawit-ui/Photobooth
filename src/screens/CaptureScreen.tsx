import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  COUNTDOWN_FIRST_SECONDS,
  COUNTDOWN_NEXT_SECONDS,
  CROP_FOCAL_Y,
  MAX_CAPTURE_HEIGHT,
  MIRROR_OUTPUT,
  PAUSE_BETWEEN_SHOTS_MS,
  SHOT_COUNT,
  USE_STILL_PHOTO,
} from '../config/app';
import type { FrameConfig } from '../config/frames';
import { CameraControls } from '../components/CameraControls';
import { CameraInfo } from '../components/CameraInfo';
import { CameraPicker } from '../components/CameraPicker';
import { LayoutMap } from '../components/LayoutMap';
import { MagicSparkles } from '../components/MagicSparkles';
import { MagicLoader } from '../components/MagicLoader';
import { PermissionHelp } from '../components/PermissionHelp';
import type { CameraState } from '../hooks/useCamera';
import { useFitSize } from '../hooks/useFitSize';
import { useSpacebar } from '../hooks/useSpacebar';
import { loadSettings, saveSettings } from '../lib/boothSettings';
import { captureFrame, LOW_RES_HEIGHT, waitForVideo } from '../lib/camera';
import {
  detectFeatures,
  focusAt,
  NO_FEATURES,
  preferContinuous,
  takeStill,
  videoTrack,
  type CameraFeatures,
} from '../lib/cameraControls';
import { canvasToBlob, releaseCanvas } from '../lib/canvas';
import { isMobileDevice, isTouchDevice } from '../lib/device';
import { sound } from '../lib/sound';
import type { Shot } from '../types';
import { CameraIcon, ChevronLeftIcon, FlipIcon } from '../components/icons';

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
  const [mirrorPreview, setMirrorPreview] = useState(() => loadSettings().mirrorPreview);
  const [features, setFeatures] = useState<CameraFeatures>(NO_FEATURES);
  const [showInfo, setShowInfo] = useState(false);
  const [focusMark, setFocusMark] = useState<{ x: number; y: number; key: number } | null>(null);
  const track = videoTrack(camera.stream);
  const mode = track?.getSettings();
  // Staff hint: the camera itself only sends a small picture.
  const lowRes = !!mode?.height && Math.min(mode.width ?? 0, mode.height) < LOW_RES_HEIGHT;

  // What this camera can do (zoom, brightness, torch, full-res stills...).
  useEffect(() => {
    let alive = true;
    setFeatures(NO_FEATURES);
    if (!track) return;
    void preferContinuous(track);
    void detectFeatures(track).then((f) => alive && setFeatures(f));
    return () => {
      alive = false;
    };
  }, [track]);

  /** Tap the preview to focus there (cameras that support it). */
  const onPreviewTap = (e: ReactPointerEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!track || !features.tapToFocus || !video?.videoWidth) return;
    const r = e.currentTarget.getBoundingClientRect();
    const scale = Math.max(r.width / video.videoWidth, r.height / video.videoHeight);
    const dw = video.videoWidth * scale;
    const dh = video.videoHeight * scale;
    let px = e.clientX - r.left;
    const py = e.clientY - r.top;
    setFocusMark({ x: px, y: py, key: Date.now() });
    if (mirrorPreview) px = r.width - px;
    const x = (px - (r.width - dw) * 0.5) / dw;
    const y = (py - (r.height - dh) * CROP_FOCAL_Y) / dh;
    void focusAt(track, Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y)));
  };

  const toggleMirror = () => {
    const next = !mirrorPreview;
    setMirrorPreview(next);
    saveSettings({ mirrorPreview: next });
  };

  // Preview uses the shape of the slot being shot, so what you see is what
  // gets cropped. Special layouts mix landscape and portrait slots.
  const slot = frame.slots[shotIndex] ?? frame.slots[0];
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
        sound.shutter();
        setFlashKey((k) => k + 1);
        // Phones: a real full-resolution photo (the white flash doubles as a
        // screen flash for the front camera). Computers: the video frame.
        const liveTrack = videoTrack(camera.stream);
        const still =
          USE_STILL_PHOTO && isMobileDevice && features.still && liveTrack
            ? await takeStill(liveTrack, features.still, video.videoWidth / video.videoHeight, MAX_CAPTURE_HEIGHT)
            : null;
        const canvas = still ?? captureFrame(video);
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
      setShotIndex(0);
      setPhase('ready');
      setFailed(true);
    }
  }, [phase, camera.status, camera.stream, features.still, onBusyChange, onShot, onComplete]);

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
          className={features.tapToFocus ? 'preview can-focus' : 'preview'}
          style={fit ? { width: fit.width, height: fit.height } : { visibility: 'hidden' }}
          onPointerDown={onPreviewTap}
        >
          <video
            ref={videoRef}
            className={mirrorPreview ? 'preview-video is-mirrored' : 'preview-video'}
            style={{ objectPosition: `50% ${CROP_FOCAL_Y * 100}%` }}
            autoPlay
            playsInline
            muted
          />
          <MagicSparkles burstKey={flashKey} />
          <div className="preview-frame" aria-hidden="true" />
          {focusMark && (
            <span
              className="focus-mark"
              key={focusMark.key}
              style={{ left: focusMark.x, top: focusMark.y }}
              aria-hidden="true"
            />
          )}
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
            <LayoutMap frame={frame} current={shotIndex} taken={shots.length} />
          </div>
        ) : (
          <>
            <div className="panel-status">
              <p className="panel-title">{frame.name}</p>
              <p className="panel-text">
                <span className="text-long">
                  ถ่ายทั้งหมด {SHOT_COUNT} ช็อต ช็อตแรกนับถอยหลัง {COUNTDOWN_FIRST_SECONDS} วินาที ช็อตถัดไป {COUNTDOWN_NEXT_SECONDS} วินาที
                </span>
                <span className="text-short">
                  {SHOT_COUNT} ช็อต · นับถอยหลัง {COUNTDOWN_FIRST_SECONDS} / {COUNTDOWN_NEXT_SECONDS} วินาที
                </span>
              </p>
              {failed && <p className="panel-error">ถ่ายไม่สำเร็จ ลองกดเริ่มใหม่อีกครั้ง</p>}
              <LayoutMap frame={frame} current={-1} taken={0} className="layout-map--ready" />
            </div>
            <button
              type="button"
              className="btn btn-gold btn-hero btn-shoot"
              onClick={start}
              disabled={camera.status !== 'ready'}
            >
              <CameraIcon width="28" height="28" /> เริ่มถ่าย
            </button>
            {!isTouchDevice && <p className="hint">หรือกด Spacebar</p>}
            <CameraControls track={track} features={features} />
            {lowRes && (
              <p className="low-res-note" role="status">
                กล้องนี้ส่งภาพแค่ {mode?.width}×{mode?.height} รูปจะไม่คม
                <span>ถ้าเป็น Sony ผ่าน Imaging Edge Webcam ให้ต่อผ่าน HDMI capture card แทน</span>
              </p>
            )}
            <div className="panel-tools">
              <CameraPicker
                devices={camera.devices}
                value={camera.deviceId}
                onChange={camera.selectDevice}
                onInfo={() => setShowInfo(true)}
              />
              <button
                type="button"
                className="btn btn-ghost btn-small tool-btn"
                aria-pressed={mirrorPreview}
                onClick={toggleMirror}
                title="สลับซ้าย-ขวาเฉพาะภาพบนจอ รูปที่ได้ไม่เปลี่ยน"
              >
                <FlipIcon />
                {mirrorPreview ? 'จอแบบกระจก' : 'จอตรงกับรูปจริง'}
              </button>
              <button type="button" className="btn btn-ghost btn-small tool-btn" onClick={onBack}>
                <ChevronLeftIcon />
                เปลี่ยนกรอบ
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
      {showInfo && (
        <CameraInfo stream={camera.stream} devices={camera.devices} onClose={() => setShowInfo(false)} />
      )}
    </main>
  );
}

