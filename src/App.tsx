import { useCallback, useEffect, useRef, useState } from 'react';
import { IDLE_TIMEOUT_MS, MAGIC_SCENE_DEFAULT_ON, MIRROR_OUTPUT } from './config/app';
import { FRAMES, loadFrameCatalog, type FrameConfig } from './config/frames';
import { FullscreenButton } from './components/FullscreenButton';
import { SoundToggle } from './components/SoundToggle';
import { StarField } from './components/StarField';
import { useCamera } from './hooks/useCamera';
import { useIdleTimer } from './hooks/useIdleTimer';
import { useWakeLock } from './hooks/useWakeLock';
import { releaseCanvas } from './lib/canvas';
import { loadFrameAssets } from './lib/compose';
import { makeBaseFilename } from './lib/filename';
import {
  assemblePrepared,
  disposePrepared,
  prepareShot,
  prepareShots,
  renderOutputs,
  slotAspect,
  type Look,
  type Prepared,
  type PreparedShot,
} from './lib/look';
import { preloadSegmenter } from './lib/segment';
import { sound } from './lib/sound';
import { CaptureScreen } from './screens/CaptureScreen';
import { DownloadScreen } from './screens/DownloadScreen';
import { FrameSelectScreen } from './screens/FrameSelectScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ResultScreen } from './screens/ResultScreen';
import type { Outputs, Screen, Shot } from './types';

const MIN_LOADING_MS = 1200;
const DEFAULT_LOOK: Look = { scene: MAGIC_SCENE_DEFAULT_ON, filter: 'none' };

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
  // Cropped + segmented shots, and the look chosen on the result screen.
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [look, setLook] = useState<Look>(DEFAULT_LOOK);
  const [rendering, setRendering] = useState(false);
  const genId = useRef(0);
  const renderId = useRef(0);
  const baseName = useRef('');
  // Per-shot preparation started while the remaining shots are being taken.
  const prepQueue = useRef<Promise<PreparedShot | null>[]>([]);

  const frame = frames.find((f) => f.id === frameId) ?? frames[0];
  const outputsRef = useRef<Outputs | null>(null);
  outputsRef.current = outputs;

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

  // Warm up the person-segmentation model while guests pick a frame.
  useEffect(() => {
    if (screen === 'frames') preloadSegmenter();
  }, [screen]);

  const resetPrepQueue = useCallback(() => {
    const old = prepQueue.current;
    prepQueue.current = [];
    old.forEach((p) =>
      p.then((s) => s && disposePrepared({ shots: [s], aspect: 1, sceneAvailable: false })),
    );
  }, []);

  const clearSession = useCallback(() => {
    genId.current++;
    resetPrepQueue();
    renderId.current++;
    setPrepared((prev) => {
      disposePrepared(prev);
      return null;
    });
    setRendering(false);
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
  }, [resetPrepQueue]);

  const goHome = useCallback(() => {
    clearSession();
    setFrameId('');
    setLook(DEFAULT_LOOK);
    setScreen('home');
  }, [clearSession]);

  const idleEnabled = screen !== 'home' && !busy && !(screen === 'result' && !outputs && !genError);
  useIdleTimer(idleEnabled, IDLE_TIMEOUT_MS, goHome);

  // Slow step, once per session: crop the shots and cut out the people.
  const prepare = useCallback(
    async (taken: Shot[]) => {
      const id = ++genId.current;
      renderId.current++;
      setGenError(false);
      setOutputs((prev) => {
        disposeOutputs(prev);
        return null;
      });
      setPrepared((prev) => {
        disposePrepared(prev);
        return null;
      });
      try {
        // Use the per-shot work done during the session; redo anything missing.
        const queued = prepQueue.current;
        prepQueue.current = [];
        const aspect = slotAspect(frame);
        const results = queued.length === taken.length ? await Promise.all(queued) : [];
        const p =
          results.length === taken.length && results.every(Boolean)
            ? assemblePrepared(results as PreparedShot[], aspect)
            : await prepareShots(frame, taken.map((s) => s.canvas), MIRROR_OUTPUT);
        if (p.shots !== results) results.forEach((r) => r && disposePrepared({ shots: [r], aspect, sceneAvailable: false }));
        if (id !== genId.current) {
          disposePrepared(p);
          return;
        }
        baseName.current = makeBaseFilename();
        setPrepared(p);
      } catch (err) {
        console.error(err);
        if (id === genId.current) setGenError(true);
      }
    },
    [frame],
  );

  // Fast step: (re)build the JPG + GIF whenever the look changes.
  useEffect(() => {
    if (!prepared) return;
    const id = ++renderId.current;
    const first = !outputsRef.current;
    const started = performance.now();
    setRendering(true);
    (async () => {
      try {
        const assets = await loadFrameAssets(frame);
        const effective = { ...look, scene: look.scene && prepared.sceneAvailable };
        const { jpg, gif } = await renderOutputs(frame, assets, prepared, effective);
        const wait = first ? MIN_LOADING_MS - (performance.now() - started) : 0;
        if (wait > 0) await new Promise((r) => window.setTimeout(r, wait));
        if (id !== renderId.current) return;
        setOutputs((prev) => {
          disposeOutputs(prev);
          return {
            baseName: baseName.current,
            jpg,
            jpgUrl: URL.createObjectURL(jpg),
            gif,
            gifUrl: URL.createObjectURL(gif),
          };
        });
        setRendering(false);
        if (first) sound.chime();
      } catch (err) {
        console.error(err);
        if (id === renderId.current) {
          setRendering(false);
          setGenError(true);
        }
      }
    })();
  }, [prepared, look, frame]);

  // Start cropping + segmenting each shot as soon as it's taken.
  const handleShot = useCallback(
    (shot: Shot, index: number) => {
      if (index === 0) resetPrepQueue(); // new capture run
      const aspect = slotAspect(frame);
      prepQueue.current[index] = new Promise<void>((r) => window.setTimeout(r, 60))
        .then(() => prepareShot(shot.canvas, aspect, MIRROR_OUTPUT))
        .catch((err) => {
          console.warn('Shot preparation failed, will retry after capture', err);
          return null;
        });
    },
    [frame, resetPrepQueue],
  );

  const handleCaptureComplete = useCallback(
    (taken: Shot[]) => {
      setShots(taken);
      setScreen('result');
      void prepare(taken);
    },
    [prepare],
  );

  const handleRetake = useCallback(() => {
    clearSession();
    setScreen('capture');
  }, [clearSession]);

  return (
    <div className="app">
      <StarField />
      <div className="top-actions">
        <SoundToggle />
        <FullscreenButton />
      </div>

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
          onShot={handleShot}
          onComplete={handleCaptureComplete}
          onBack={() => setScreen('frames')}
          onBusyChange={setBusy}
        />
      )}

      {screen === 'result' && (
        <ResultScreen
          outputs={outputs}
          error={genError}
          look={look}
          sceneAvailable={!!prepared?.sceneAvailable}
          rendering={rendering}
          onLookChange={setLook}
          onRetake={handleRetake}
          onConfirm={() => setScreen('download')}
          onRetryGenerate={() => void prepare(shots)}
        />
      )}

      {screen === 'download' && outputs && <DownloadScreen outputs={outputs} onDone={goHome} />}
    </div>
  );
}
