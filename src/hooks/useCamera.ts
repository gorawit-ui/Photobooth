import { useCallback, useEffect, useState } from 'react';
import {
  CameraError,
  activeDeviceId,
  listCameras,
  openCamera,
  stopStream,
  type CameraErrorKind,
} from '../lib/camera';

export interface CameraState {
  stream: MediaStream | null;
  status: 'idle' | 'starting' | 'ready' | 'error';
  error: CameraErrorKind | null;
  devices: MediaDeviceInfo[];
  /** Device currently streaming (or the one the user picked). */
  deviceId: string | undefined;
  selectDevice: (id: string) => void;
  retry: () => void;
}

/** Keeps a camera stream open while `active` is true. */
export function useCamera(active: boolean): CameraState {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraState['status']>('idle');
  const [error, setError] = useState<CameraErrorKind | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [chosenId, setChosenId] = useState<string | undefined>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!active) {
      setStatus('idle');
      return;
    }
    let cancelled = false;
    let current: MediaStream | null = null;
    setStatus('starting');
    setError(null);

    openCamera(chosenId)
      .then(async (s) => {
        if (cancelled) {
          stopStream(s);
          return;
        }
        current = s;
        setStream(s);
        setStatus('ready');
        // Labels are available now that permission was granted.
        const cams = await listCameras();
        if (!cancelled) setDevices(cams);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStream(null);
        setError(err instanceof CameraError ? err.kind : 'unknown');
        setStatus('error');
      });

    return () => {
      cancelled = true;
      stopStream(current);
      setStream(null);
    };
  }, [active, chosenId, attempt]);

  // Cameras plugged in / removed while running.
  useEffect(() => {
    const md = navigator.mediaDevices;
    if (!active || !md?.addEventListener) return;
    const onChange = () => listCameras().then(setDevices);
    md.addEventListener('devicechange', onChange);
    return () => md.removeEventListener('devicechange', onChange);
  }, [active]);

  const selectDevice = useCallback((id: string) => setChosenId(id), []);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    stream,
    status,
    error,
    devices,
    deviceId: activeDeviceId(stream) ?? chosenId,
    selectDevice,
    retry,
  };
}
