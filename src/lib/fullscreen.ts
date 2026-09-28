/** Fullscreen API with the webkit-prefixed fallback used by older Safari. */

type FsDocument = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FsElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

export function isFullscreenSupported(): boolean {
  const doc = document as FsDocument;
  return Boolean(doc.fullscreenEnabled || doc.webkitFullscreenEnabled);
}

export function isFullscreen(): boolean {
  const doc = document as FsDocument;
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
}

export async function toggleFullscreen(): Promise<void> {
  const doc = document as FsDocument;
  const el = document.documentElement as FsElement;
  try {
    if (isFullscreen()) {
      if (doc.exitFullscreen) await doc.exitFullscreen();
      else await doc.webkitExitFullscreen?.();
    } else if (el.requestFullscreen) {
      await el.requestFullscreen({ navigationUI: 'hide' });
    } else {
      await el.webkitRequestFullscreen?.();
    }
  } catch (err) {
    console.warn('Fullscreen request failed', err);
  }
}

export function onFullscreenChange(cb: () => void): () => void {
  document.addEventListener('fullscreenchange', cb);
  document.addEventListener('webkitfullscreenchange', cb);
  return () => {
    document.removeEventListener('fullscreenchange', cb);
    document.removeEventListener('webkitfullscreenchange', cb);
  };
}
