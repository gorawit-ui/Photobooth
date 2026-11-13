import { useCallback, useEffect, useState } from 'react';
import {
  CameraError,
  activeDeviceId,
  listCameras,
  openCamera,
  stopStream,
  type CameraErrorKind,
} from '../lib/camera';
import { loadSettings, saveSettings } from '../lib/boothSettings';
import { openTetherPreview, TETHER_DEVICE, TETHER_DEVICE_ID } from '../lib/tether';

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

/**
 * Keeps a camera stream open while `active` is true. With `tetherUrl` the
 * Sony Bridge's live view is offered as one more camera.
 */
export function useCamera(active: boolean, tetherUrl?: string | null): CameraState {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraState['status']>('idle');
  const [error, setError] = useState<CameraErrorKind | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  // Remembered across reloads so the event machine keeps using the Sony capture card.
  const [chosenId, setChosenId] = useState<string | undefined>(() => loadSettings().cameraId);
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

    // The bridge's live view only while the bridge is up; otherwise the default camera.
    const useBridge = chosenId === TETHER_DEVICE_ID;
    const open = useBridge ? (tetherUrl ? openTetherPreview(tetherUrl) : openCamera()) : openCamera(chosenId);
    open
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
  }, [active, chosenId, attempt, chosenId === TETHER_DEVICE_ID ? tetherUrl : null]);

  // Cameras plugged in / removed while running.
  useEffect(() => {
    const md = navigator.mediaDevices;
    if (!active || !md?.addEventListener) return;
    const onChange = () => listCameras().then(setDevices);
    md.addEventListener('devicechange', onChange);
    return () => md.removeEventListener('devicechange', onChange);
  }, [active]);

  const selectDevice = useCallback((id: string) => {
    saveSettings({ cameraId: id });
    setChosenId(id);
  }, []);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const usingBridge = chosenId === TETHER_DEVICE_ID && !!tetherUrl;
  return {
    stream,
    status,
    error,
    devices: tetherUrl ? [...devices, TETHER_DEVICE] : devices,
    deviceId: usingBridge ? TETHER_DEVICE_ID : (activeDeviceId(stream) ?? chosenId),
    selectDevice,
    retry,
  };
}
