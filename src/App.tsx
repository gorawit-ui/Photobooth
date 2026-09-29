import { useCallback, useEffect, useRef, useState } from 'react';
import { IDLE_TIMEOUT_MS, JPG_QUALITY, MIRROR_OUTPUT } from './config/app';
import { FRAMES, loadFrameCatalog, type FrameConfig } from './config/frames';
import { FullscreenButton } from './components/FullscreenButton';
import { StarField } from './components/StarField';
import { useCamera } from './hooks/useCamera';
import { useIdleTimer } from './hooks/useIdleTimer';
import { useWakeLock } from './hooks/useWakeLock';
import { canvasToBlob, releaseCanvas } from './lib/canvas';
import { composeFrame, loadFrameAssets } from './lib/compose';
import { makeBaseFilename } from './lib/filename';
import { createGif } from './lib/gif';
import { CaptureScreen } from './screens/CaptureScreen';
import { DownloadScreen } from './screens/DownloadScreen';
import { FrameSelectScreen } from './screens/FrameSelectScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ResultScreen } from './screens/ResultScreen';
import type { Outputs, Screen, Shot } from './types';

const MIN_LOADING_MS = 1200;

function disposeShots(shots: Shot[]) {
  shots.forEach((s) => {
    URL.revokeObjectURL(s.url);
    releaseCanvas(s.canvas);
  });
}

function disposeOutputs(o: Outputs | null) {
  if (!o) return;
  URL.revokeObjectURL(o.jpgUrl);
  URL.revokeObjectURL(o.gifUrl);
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [frames, setFrames] = useState<FrameConfig[]>(FRAMES);
  // '' = first frame in the catalogue. Kept for the whole session, including retakes.
  const [frameId, setFrameId] = useState('');
  const [shots, setShots] = useState<Shot[]>([]);
  const [outputs, setOutputs] = useState<Outputs | null>(null);
  const [genError, setGenError] = useState(false);
  const [busy, setBusy] = useState(false);
  const genId = useRef(0);

  const frame = frames.find((f) => f.id === frameId) ?? frames[0];

  useWakeLock();

  // Keep the camera open from frame selection through the result screen,
  // so "ถ่ายใหม่" is instant and permission is asked early.
  const camera = useCamera(screen === 'frames' || screen === 'capture' || screen === 'result');

  // Print templates from public/frames/templates.json + built-in frames.
  useEffect(() => {
    let cancelled = false;
    loadFrameCatalog().then((list) => {
      if (!cancelled) setFrames(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Preload frame artwork so previews and composition are quick.
  useEffect(() => {
    frames.forEach((f) => void loadFrameAssets(f));
  }, [frames]);

  const clearSession = useCallback(() => {
    genId.current++;
    setShots((prev) => {
      disposeShots(prev);
      return [];
    });
    setOutputs((prev) => {
      disposeOutputs(prev);
      return null;
    });
    setGenError(false);
    setBusy(false);
  }, []);

  const goHome = useCallback(() => {
    clearSession();
    setFrameId('');
    setScreen('home');
  }, [clearSession]);

  const idleEnabled = screen !== 'home' && !busy && !(screen === 'result' && !outputs && !genError);
  useIdleTimer(idleEnabled, IDLE_TIMEOUT_MS, goHome);

  const generate = useCallback(
    async (taken: Shot[]) => {
      const id = ++genId.current;
      setGenError(false);
      setOutputs(null);
      const started = performance.now();
      try {
        const assets = await loadFrameAssets(frame);
        const canvases = taken.map((s) => s.canvas);
        const composed = composeFrame(frame, assets, canvases, { mirror: MIRROR_OUTPUT });
        const jpg = await canvasToBlob(composed, 'image/jpeg', JPG_QUALITY);
        releaseCanvas(composed);
        const gif = await createGif(frame, assets, canvases, MIRROR_OUTPUT);
        const wait = MIN_LOADING_MS - (performance.now() - started);
        if (wait > 0) await new Promise((r) => window.setTimeout(r, wait));
        if (id !== genId.current) return;
        setOutputs({
          baseName: makeBaseFilename(),
          jpg,
          jpgUrl: URL.createObjectURL(jpg),
          gif,
          gifUrl: URL.createObjectURL(gif),
        });
      } catch (err) {
        console.error(err);
        if (id === genId.current) setGenError(true);
      }
    },
    [frame],
  );

  const handleCaptureComplete = useCallback(
    (taken: Shot[]) => {
      setShots(taken);
      setScreen('result');
      void generate(taken);
    },
    [generate],
  );

  const handleRetake = useCallback(() => {
    clearSession();
    setScreen('capture');
  }, [clearSession]);

  return (
    <div className="app">
      <StarField />
      <FullscreenButton />

      {screen === 'home' && <HomeScreen onStart={() => setScreen('frames')} />}

      {screen === 'frames' && (
        <FrameSelectScreen
          frames={frames}
          selectedId={frame.id}
          onSelect={setFrameId}
          onConfirm={() => {
            setFrameId(frame.id); // pin the choice for the whole session
            setScreen('capture');
          }}
          onBack={goHome}
        />
      )}

      {screen === 'capture' && (
        <CaptureScreen
          frame={frame}
          camera={camera}
          onComplete={handleCaptureComplete}
          onBack={() => setScreen('frames')}
          onBusyChange={setBusy}
        />
      )}

      {screen === 'result' && (
        <ResultScreen
          outputs={outputs}
          error={genError}
          onRetake={handleRetake}
          onConfirm={() => setScreen('download')}
          onRetryGenerate={() => void generate(shots)}
        />
      )}

      {screen === 'download' && outputs && <DownloadScreen outputs={outputs} onDone={goHome} />}
    </div>
  );
}
